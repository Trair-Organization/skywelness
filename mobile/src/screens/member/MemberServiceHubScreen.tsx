import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';

export type ServiceHubMode = 'personal_training' | 'massage';

type TrainerRow = {
  id: string;
  bio: string | null;
  certifications: unknown;
  specializations: unknown;
  photoUrl: string | null;
  avgRating: string;
  totalSessions: number;
  /** Trainer profile row creation — used for “with us since” in the app. */
  memberSince?: string;
  user: { id: string; firstName: string; lastName: string };
};

type SlotRow = {
  id: string;
  trainerId: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  remainingCapacity: number;
};

type MyPackageRow = {
  id: string;
  remainingSessions: number;
  expiresAt: string;
  status: string;
  packageType: { id: string; name: string; sessionType: string };
};

type HubReservation = {
  id: string;
  status: string;
  sessionType: string;
  startTime: string;
  endTime: string;
  trainer: { user: { firstName: string; lastName: string } };
  package: {
    remainingSessions: number;
    status: string;
    packageTypeName: string;
  };
};

const TAB_BAR_PAD = 72;

/** Published slots are shown in 1-hour buckets from club opening through last start hour. */
const CLUB_OPEN_HOUR = 6;
const CLUB_LAST_START_HOUR = 21;

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function sumRemainingForType(rows: MyPackageRow[], sessionType: ServiceHubMode): number {
  const today = new Date().toISOString().slice(0, 10);
  return rows
    .filter(
      (p) =>
        p.status === 'active' &&
        p.remainingSessions > 0 &&
        p.packageType?.sessionType === sessionType &&
        typeof p.expiresAt === 'string' &&
        p.expiresAt >= today,
    )
    .reduce((acc, p) => acc + p.remainingSessions, 0);
}

function jsonToLines(v: unknown): string | null {
  if (v == null) {
    return null;
  }
  if (Array.isArray(v)) {
    return v.map((x) => String(x)).join(', ');
  }
  if (typeof v === 'string') {
    return v;
  }
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

function truncateTeaser(s: string, max: number): string {
  const x = s.trim();
  if (x.length <= max) {
    return x;
  }
  return `${x.slice(0, Math.max(1, max - 1)).trim()}…`;
}

function staffSpecializationTeaser(tr: TrainerRow): string | null {
  const raw = jsonToLines(tr.specializations);
  if (!raw) {
    return null;
  }
  return truncateTeaser(raw, 72);
}

function formatRatingDisplay(avg: string): string {
  const n = Number.parseFloat(avg);
  if (Number.isNaN(n)) {
    return avg;
  }
  return n.toFixed(1);
}

function sameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Index 0 = Monday … 6 = Sunday within `weekStartMonday` week; prefers today when it falls in that week. */
function dayIndexInWeek(weekStartMonday: Date): number {
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStartMonday, i);
    if (sameLocalCalendarDay(d, now)) {
      return i;
    }
  }
  return 0;
}

function weekOffsetForPickedDate(d: Date): number {
  const pickedMonday = startOfWeekMonday(d);
  const thisMonday = startOfWeekMonday(new Date());
  const diffMs = pickedMonday.getTime() - thisMonday.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

function dayIndexForPickedDate(d: Date): number {
  const mon = startOfWeekMonday(d);
  for (let i = 0; i < 7; i++) {
    if (sameLocalCalendarDay(addDays(mon, i), d)) {
      return i;
    }
  }
  return 0;
}

/** Slot whose local start time falls on `day` and starts in hour `bucketHour` (e.g. 6 → 06:00–07:00). */
function findSlotInBucket(
  rows: SlotRow[],
  trainerId: string,
  day: Date,
  bucketHour: number,
): SlotRow | null {
  for (const s of rows) {
    if (s.trainerId !== trainerId) {
      continue;
    }
    const st = new Date(s.startTime);
    if (!sameLocalCalendarDay(st, day)) {
      continue;
    }
    if (st.getHours() === bucketHour) {
      return s;
    }
  }
  return null;
}

function formatHourBucketLabel(startHour: number): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(startHour)}:00–${pad(startHour + 1)}:00`;
}

function formatSlotTimeSpan(slot: SlotRow, locale: string): string {
  try {
    const loc = locale.startsWith('tr') ? 'tr-TR' : undefined;
    const o: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const a = new Date(slot.startTime).toLocaleTimeString(loc, o);
    const b = new Date(slot.endTime).toLocaleTimeString(loc, o);
    return `${a} – ${b}`;
  } catch {
    return fmt(slot.startTime);
  }
}

function formatMemberSince(iso: string | undefined, locale: string): string | null {
  if (!iso) {
    return null;
  }
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

type Props = { mode: ServiceHubMode };

export function MemberServiceHubScreen({ mode }: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();

  const [packages, setPackages] = useState<MyPackageRow[]>([]);
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [reservations, setReservations] = useState<HubReservation[]>([]);
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  /** When set, full weekly calendar modal is open for this trainer. */
  const [calendarTrainer, setCalendarTrainer] = useState<TrainerRow | null>(null);
  /** 0–6: Mon–Sun within the currently displayed `rangeStart` week. */
  const [calendarDayIndex, setCalendarDayIndex] = useState(0);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [profileTrainer, setProfileTrainer] = useState<TrainerRow | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [requestSending, setRequestSending] = useState(false);
  const [packageRequestOpen, setPackageRequestOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [iosPickerValue, setIosPickerValue] = useState(() => new Date());
  const suppressCalendarDaySyncRef = useRef(false);

  const prefix = mode === 'personal_training' ? 'serviceHub.pt' : 'serviceHub.massage';

  const credits = useMemo(() => sumRemainingForType(packages, mode), [packages, mode]);

  const filteredPackages = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return packages.filter(
      (p) =>
        p.packageType.sessionType === mode &&
        p.status === 'active' &&
        p.remainingSessions > 0 &&
        p.expiresAt >= today,
    );
  }, [packages, mode]);

  const rangeStart = useMemo(() => {
    const base = addDays(new Date(), weekOffset * 7);
    return startOfWeekMonday(base);
  }, [weekOffset]);

  const rangeEnd = useMemo(() => addDays(rangeStart, 7), [rangeStart]);

  const loadAll = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    const q = new URLSearchParams({ sessionType: mode });
    const [pkgs, trs, resv] = await Promise.all([
      apiJson<MyPackageRow[]>('/my-packages', { token, tenantSubdomain: tenant.subdomain }),
      apiJson<TrainerRow[]>(`/trainers?${q}`, { token, tenantSubdomain: tenant.subdomain }),
      apiJson<HubReservation[]>(`/reservations?limit=50&sessionType=${mode}`, {
        token,
        tenantSubdomain: tenant.subdomain,
      }),
    ]);
    setPackages(pkgs);
    setTrainers(trs);
    setReservations(resv);
    setSelectedPackageId((prev) => {
      const usable = pkgs.find(
        (p) =>
          p.packageType.sessionType === mode &&
          p.status === 'active' &&
          p.remainingSessions > 0 &&
          p.expiresAt >= new Date().toISOString().slice(0, 10),
      );
      return usable?.id ?? prev ?? null;
    });
  }, [token, tenant, mode]);

  const loadSlotsForTrainer = useCallback(
    async (tid: string, from: Date, to: Date) => {
      if (!token || !tenant) {
        return;
      }
      setLoadingSlots(true);
      try {
        const q = new URLSearchParams({
          trainerId: tid,
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const rows = await apiJson<SlotRow[]>(`/availability?${q}`, {
          token,
          tenantSubdomain: tenant.subdomain,
        });
        setSlots(rows);
        setSelectedSlotId(null);
      } catch (e) {
        Alert.alert(
          t('alerts.availability'),
          e instanceof ApiError ? e.message : t('alerts.availabilityErr'),
        );
      } finally {
        setLoadingSlots(false);
      }
    },
    [token, tenant, t],
  );

  const onRefresh = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setRefreshing(true);
    try {
      await loadAll();
      if (calendarTrainer) {
        await loadSlotsForTrainer(calendarTrainer.id, rangeStart, rangeEnd);
      }
    } catch (e) {
      Alert.alert(t('alerts.generic'), e instanceof ApiError ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [token, tenant, loadAll, calendarTrainer, rangeStart, rangeEnd, loadSlotsForTrainer, t]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!token || !tenant) {
          return;
        }
        setLoadingBoot(true);
        try {
          await loadAll();
        } catch (e) {
          if (!cancelled) {
            Alert.alert(
              t('alerts.generic'),
              e instanceof ApiError ? e.message : t('alerts.loadFailed'),
            );
          }
        } finally {
          if (!cancelled) {
            setLoadingBoot(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [token, tenant, loadAll, t]),
  );

  useEffect(() => {
    if (!calendarTrainer || !token || !tenant) {
      return;
    }
    loadSlotsForTrainer(calendarTrainer.id, rangeStart, rangeEnd).catch(() => {});
  }, [calendarTrainer, rangeStart, rangeEnd, loadSlotsForTrainer, token, tenant]);

  useEffect(() => {
    setSelectedSlotId(null);
  }, [weekOffset]);

  useEffect(() => {
    if (!calendarTrainer) {
      return;
    }
    if (suppressCalendarDaySyncRef.current) {
      suppressCalendarDaySyncRef.current = false;
      return;
    }
    setCalendarDayIndex(dayIndexInWeek(rangeStart));
  }, [calendarTrainer, weekOffset, rangeStart]);

  const upcomingRes = useMemo(() => {
    const now = Date.now();
    return reservations.filter(
      (r) =>
        new Date(r.startTime).getTime() > now &&
        (r.status === 'confirmed' || r.status === 'pending'),
    );
  }, [reservations]);

  const pastRes = useMemo(() => {
    const now = Date.now();
    return reservations.filter(
      (r) =>
        new Date(r.startTime).getTime() <= now ||
        r.status === 'cancelled' ||
        r.status === 'completed',
    );
  }, [reservations]);

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) ?? null,
    [slots, selectedSlotId],
  );

  const confirmBook = useCallback(async () => {
    if (!token || !tenant || !calendarTrainer || !selectedSlotId || !selectedSlot) {
      Alert.alert(t('booking.section'), t('booking.pickSlotFirst'));
      return;
    }
    const pkgId = selectedPackageId;
    if (!pkgId) {
      Alert.alert(t('booking.section'), t('booking.pickPackageFirst'));
      return;
    }
    setBooking(true);
    try {
      const from = new Date(selectedSlot.startTime);
      from.setMinutes(from.getMinutes() - 30);
      const to = new Date(selectedSlot.endTime);
      to.setMinutes(to.getMinutes() + 30);
      const refreshed = await apiJson<SlotRow[]>(
        `/availability?${new URLSearchParams({
          trainerId: selectedSlot.trainerId,
          from: from.toISOString(),
          to: to.toISOString(),
        })}`,
        { token, tenantSubdomain: tenant.subdomain },
      );
      const live = refreshed.find((s) => s.id === selectedSlotId);
      if (!live || live.remainingCapacity < 1) {
        Alert.alert(t('booking.section'), t('serviceHub.slotGone'));
        await loadSlotsForTrainer(calendarTrainer.id, rangeStart, rangeEnd);
        setBooking(false);
        return;
      }
      await apiJson('/reservations', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({
          timeSlotId: selectedSlotId,
          packageId: pkgId,
        }),
      });
      Alert.alert(t('booking.section'), t('booking.created'));
      setSelectedSlotId(null);
      await loadAll();
      if (calendarTrainer) {
        await loadSlotsForTrainer(calendarTrainer.id, rangeStart, rangeEnd);
      }
    } catch (e) {
      Alert.alert(
        t('booking.section'),
        e instanceof ApiError ? e.message : t('booking.bookFailed'),
      );
    } finally {
      setBooking(false);
    }
  }, [
    token,
    tenant,
    selectedSlotId,
    selectedSlot,
    selectedPackageId,
    calendarTrainer,
    loadAll,
    loadSlotsForTrainer,
    rangeStart,
    rangeEnd,
    t,
  ]);

  const sendPackageRequest = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setRequestSending(true);
    try {
      await apiJson('/package-requests', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({
          sessionType: mode,
          message: requestNote.trim() || undefined,
        }),
      });
      setRequestNote('');
      setPackageRequestOpen(false);
      Alert.alert(t(`${prefix}.requestTitle`), t('serviceHub.requestOk'));
    } catch (e) {
      Alert.alert(
        t(`${prefix}.requestTitle`),
        e instanceof ApiError ? e.message : t('serviceHub.requestFail'),
      );
    } finally {
      setRequestSending(false);
    }
  }, [token, tenant, requestNote, mode, t, prefix]);

  const cancelReservation = useCallback(
    async (id: string) => {
      if (!token || !tenant) {
        return;
      }
      setCancellingId(id);
      try {
        await apiJson(`/reservations/${id}/cancel`, {
          method: 'POST',
          token,
          tenantSubdomain: tenant.subdomain,
        });
        Alert.alert(t('booking.section'), t('booking.cancelled'));
        await loadAll();
        if (calendarTrainer) {
          await loadSlotsForTrainer(calendarTrainer.id, rangeStart, rangeEnd);
        }
      } catch (e) {
        Alert.alert(
          t('booking.section'),
          e instanceof ApiError ? e.message : t('booking.cancelFailed'),
        );
      } finally {
        setCancellingId(null);
      }
    },
    [token, tenant, loadAll, calendarTrainer, loadSlotsForTrainer, rangeStart, rangeEnd, t],
  );

  const applyPickedDate = useCallback((d: Date) => {
    suppressCalendarDaySyncRef.current = true;
    setWeekOffset(weekOffsetForPickedDate(d));
    setCalendarDayIndex(dayIndexForPickedDate(d));
    setSelectedSlotId(null);
  }, []);

  const jumpToToday = useCallback(() => {
    suppressCalendarDaySyncRef.current = true;
    setWeekOffset(0);
    setCalendarDayIndex(dayIndexForPickedDate(new Date()));
    setSelectedSlotId(null);
  }, []);

  const openDatePicker = useCallback(() => {
    const base = addDays(rangeStart, calendarDayIndex);
    setIosPickerValue(base);
    setShowDatePicker(true);
  }, [rangeStart, calendarDayIndex]);

  const onAndroidDateChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      setShowDatePicker(false);
      if (event.type === 'set' && date) {
        applyPickedDate(date);
      }
    },
    [applyPickedDate],
  );

  const weekLabel = `${rangeStart.toLocaleDateString()} — ${addDays(rangeEnd, -1).toLocaleDateString()}`;

  const weekDayDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i)),
    [rangeStart],
  );

  const hourBuckets = useMemo(
    () =>
      Array.from(
        { length: CLUB_LAST_START_HOUR - CLUB_OPEN_HOUR + 1 },
        (_, i) => CLUB_OPEN_HOUR + i,
      ),
    [],
  );

  const windowHeight = Dimensions.get('window').height;

  const selectedPackageForFooter = useMemo(
    () => filteredPackages.find((p) => p.id === selectedPackageId) ?? null,
    [filteredPackages, selectedPackageId],
  );

  const ripple =
    Platform.OS === 'android' ? { android_ripple: { color: 'rgba(255,255,255,0.2)' } } : {};

  if (!token || !tenant) {
    return null;
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + TAB_BAR_PAD },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              onRefresh().catch(() => {});
            }}
            tintColor="#fff"
          />
        }
      >
        {loadingBoot ? <ActivityIndicator color={premium.accentBlue} style={styles.mb} /> : null}

        <GlassCard style={styles.card}>
          <View style={styles.creditsRow}>
            <Text style={styles.creditsLine} accessibilityRole="text">
              {t('serviceHub.creditsLine', { n: credits })}
            </Text>
            <Pressable
              accessibilityLabel={t(
                mode === 'massage'
                  ? 'serviceHub.addPackageA11yMassage'
                  : 'serviceHub.addPackageA11y',
              )}
              style={({ pressed }) => [
                styles.addPackageBtn,
                pressed && styles.addPackageBtnPressed,
              ]}
              onPress={() => setPackageRequestOpen(true)}
            >
              <Text style={styles.addPackageIcon}>+</Text>
            </Pressable>
          </View>
          {filteredPackages.length === 0 ? (
            <Text style={styles.warn}>{t('serviceHub.noActivePackage')}</Text>
          ) : (
            filteredPackages.map((p) => (
              <Text key={p.id} style={styles.muted}>
                · {p.packageType.name} — {p.remainingSessions} ({p.expiresAt})
              </Text>
            ))
          )}
        </GlassCard>

        <Text style={styles.sectionHeading}>{t(`${prefix}.staffTitle`)}</Text>
        {trainers.length === 0 ? (
          <Text style={styles.muted}>{t(`${prefix}.staffEmpty`)}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hRail}>
            {trainers.map((tr) => {
              const teaser = staffSpecializationTeaser(tr);
              const fullName = `${tr.user.firstName} ${tr.user.lastName}`;
              return (
                <Pressable
                  key={tr.id}
                  accessibilityRole="button"
                  accessibilityHint={t('serviceHub.openProfileHint')}
                  accessibilityLabel={`${fullName}, ${t('serviceHub.sessionsShort', { n: tr.totalSessions })}`}
                  style={({ pressed }) => [
                    styles.staffCardOuter,
                    pressed && styles.staffCardOuterPressed,
                  ]}
                  onPress={() => {
                    setProfileTrainer(tr);
                  }}
                >
                  <View style={styles.staffPhotoClip}>
                    {tr.photoUrl ? (
                      <Image
                        source={{ uri: tr.photoUrl }}
                        style={styles.staffHeroPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.staffHeroPhoto, styles.staffHeroPhotoPh]}>
                        <Text style={styles.staffHeroLetter}>
                          {(tr.user.firstName[0] ?? '?').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.staffCardInner}>
                    <Text style={styles.staffNameCard} numberOfLines={1}>
                      {fullName}
                    </Text>
                    <View style={styles.staffStatsRow}>
                      <View style={styles.ratingPill}>
                        <Text style={styles.ratingPillTxt}>
                          ★ {formatRatingDisplay(tr.avgRating)}
                        </Text>
                      </View>
                      <Text style={styles.sessionsTxt}>
                        {t('serviceHub.sessionsShort', { n: tr.totalSessions })}
                      </Text>
                    </View>
                    {teaser ? (
                      <Text style={styles.staffTeaserTxt} numberOfLines={2}>
                        {teaser}
                      </Text>
                    ) : (
                      <Text style={styles.staffFallbackHint} numberOfLines={2}>
                        {t('serviceHub.openProfileHint')}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.sectionHeading}>{t('serviceHub.upcoming')}</Text>
        <GlassCard style={styles.card}>
          {upcomingRes.length === 0 ? (
            <Text style={styles.muted}>{t('serviceHub.noUpcoming')}</Text>
          ) : (
            upcomingRes.map((r) => {
              const canCancel =
                (r.status === 'confirmed' || r.status === 'pending') &&
                new Date(r.startTime) > new Date();
              return (
                <View key={r.id} style={styles.resRow}>
                  <Text style={styles.resTxt}>
                    {fmt(r.startTime)} · {r.trainer.user.firstName} {r.trainer.user.lastName} ·{' '}
                    {r.package.packageTypeName}
                  </Text>
                  {canCancel ? (
                    <Pressable
                      style={styles.btnDanger}
                      disabled={cancellingId === r.id}
                      onPress={() => {
                        cancelReservation(r.id).catch(() => {});
                      }}
                    >
                      {cancellingId === r.id ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnDangerTxt}>{t('booking.cancel')}</Text>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </GlassCard>

        <Text style={styles.sectionHeading}>{t('serviceHub.past')}</Text>
        <GlassCard style={styles.card}>
          {pastRes.length === 0 ? (
            <Text style={styles.muted}>{t('serviceHub.noPast')}</Text>
          ) : (
            pastRes.slice(0, 20).map((r) => (
              <Text key={r.id} style={styles.pastLine}>
                {fmt(r.startTime)} · {r.trainer.user.firstName} {r.trainer.user.lastName} ·{' '}
                {r.status}
              </Text>
            ))
          )}
        </GlassCard>
      </ScrollView>

      <Modal
        visible={profileTrainer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileTrainer(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setProfileTrainer(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {profileTrainer ? (
              <>
                <View style={styles.modalProfileHeader}>
                  <Text style={styles.modalProfileTitle} numberOfLines={2}>
                    {profileTrainer.user.firstName} {profileTrainer.user.lastName}
                  </Text>
                  <Pressable
                    hitSlop={14}
                    accessibilityRole="button"
                    accessibilityLabel={t('serviceHub.profileClose')}
                    onPress={() => setProfileTrainer(null)}
                    style={({ pressed }) => [styles.modalCloseRound, pressed && { opacity: 0.75 }]}
                  >
                    <Text style={styles.modalCloseRoundTxt}>×</Text>
                  </Pressable>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                >
                  {profileTrainer.photoUrl ? (
                    <Image
                      source={{ uri: profileTrainer.photoUrl }}
                      style={styles.modalHeroImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.modalHeroImg, styles.modalHeroImgPh]}>
                      <Text style={styles.modalHeroLetter}>
                        {(profileTrainer.user.firstName[0] ?? '?').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalRatingStrip}>
                    <Text style={styles.modalRatingMain}>
                      ★ {formatRatingDisplay(profileTrainer.avgRating)}
                    </Text>
                    <Text style={styles.modalSessionsMain}>
                      {t('serviceHub.sessionsShort', { n: profileTrainer.totalSessions })}
                    </Text>
                  </View>
                  {(() => {
                    const sinceLabel = formatMemberSince(profileTrainer.memberSince, i18n.language);
                    return sinceLabel ? (
                      <Text style={styles.modalMemberSince}>
                        {t('serviceHub.memberSince', { date: sinceLabel })}
                      </Text>
                    ) : null;
                  })()}
                  <Text style={styles.modalDisclaimer}>{t('serviceHub.ratingDisclaimer')}</Text>

                  <Text style={styles.modalSectionTitle}>{t('serviceHub.modalAbout')}</Text>
                  <Text style={styles.modalBio}>
                    {profileTrainer.bio?.trim() ? profileTrainer.bio : t('serviceHub.noBio')}
                  </Text>

                  {(() => {
                    const specLine = jsonToLines(profileTrainer.specializations);
                    const specItems = specLine
                      ? specLine
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean)
                      : [];
                    return specItems.length > 0 ? (
                      <View style={styles.modalSectionBlock}>
                        <Text style={styles.modalSectionTitle}>
                          {t('serviceHub.modalSpecialties')}
                        </Text>
                        <View style={styles.modalChipsRow}>
                          {specItems.map((label, idx) => (
                            <View key={`${label}-${idx}`} style={styles.modalChip}>
                              <Text style={styles.modalChipTxt} numberOfLines={2}>
                                {label}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null;
                  })()}

                  {jsonToLines(profileTrainer.certifications) ? (
                    <View style={styles.modalSectionBlock}>
                      <Text style={styles.modalSectionTitle}>{t('serviceHub.modalCerts')}</Text>
                      <Text style={styles.modalMeta}>
                        {jsonToLines(profileTrainer.certifications)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.modalActions}>
                    <Pressable style={styles.btnOutline} onPress={() => setProfileTrainer(null)}>
                      <Text style={styles.btnOutlineTxt}>{t('serviceHub.profileClose')}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.btnPrimary}
                      onPress={() => {
                        setSelectedSlotId(null);
                        setCalendarTrainer(profileTrainer);
                        setProfileTrainer(null);
                      }}
                    >
                      <Text style={styles.btnPrimaryTxt}>{t('serviceHub.profilePick')}</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={calendarTrainer !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setCalendarTrainer(null);
          setSelectedSlotId(null);
          setShowDatePicker(false);
        }}
      >
        <View style={styles.calendarModalBackdrop}>
          <Pressable
            style={styles.calendarModalDismissLayer}
            onPress={() => {
              setCalendarTrainer(null);
              setSelectedSlotId(null);
              setShowDatePicker(false);
            }}
          />
          <View style={styles.calendarSheet}>
            {calendarTrainer ? (
              <>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: windowHeight * 0.58 }}
                  contentContainerStyle={styles.calendarScrollContent}
                >
                  <View style={styles.calendarModalHeader}>
                    <View style={styles.calendarHeaderTitleBlock}>
                      <Text style={styles.calendarModalTitle} numberOfLines={1}>
                        {calendarTrainer.user.firstName} {calendarTrainer.user.lastName}
                      </Text>
                      <Text style={styles.calendarModalSub}>
                        {t('serviceHub.calendarWeeklyTitle')}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={14}
                      accessibilityRole="button"
                      accessibilityLabel={t('serviceHub.profileClose')}
                      onPress={() => {
                        setCalendarTrainer(null);
                        setSelectedSlotId(null);
                        setShowDatePicker(false);
                      }}
                      style={({ pressed }) => [
                        styles.modalCloseRound,
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      <Text style={styles.modalCloseRoundTxt}>×</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.calendarHint}>{t('serviceHub.calendarWeeklyHint')}</Text>
                  <View style={styles.weekRow}>
                    <Pressable style={styles.weekBtn} onPress={() => setWeekOffset((w) => w - 1)}>
                      <Text style={styles.weekBtnTxt}>{t('serviceHub.weekPrev')}</Text>
                    </Pressable>
                    <Text style={styles.weekRange}>{weekLabel}</Text>
                    <Pressable style={styles.weekBtn} onPress={() => setWeekOffset((w) => w + 1)}>
                      <Text style={styles.weekBtnTxt}>{t('serviceHub.weekNext')}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.quickActionsRow}>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.todayShortcutBtn,
                        pressed && styles.todayShortcutBtnPressed,
                      ]}
                      onPress={jumpToToday}
                    >
                      <Text style={styles.todayShortcutTxt}>{t('serviceHub.todayShortcut')}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.pickDateBtn,
                        pressed && styles.pickDateBtnPressed,
                      ]}
                      onPress={openDatePicker}
                    >
                      <Text style={styles.pickDateTxt}>{t('serviceHub.pickDate')}</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.calendarPickDayLabel}>{t('serviceHub.calendarPickDay')}</Text>
                  <View style={styles.dayChipRow}>
                    {weekDayDates.map((dayDate, i) => {
                      const loc = i18n.language.startsWith('tr') ? 'tr-TR' : undefined;
                      const labelShort = dayDate.toLocaleDateString(loc, { weekday: 'short' });
                      const num = dayDate.getDate();
                      const sel = i === calendarDayIndex;
                      return (
                        <Pressable
                          key={`day-chip-${i}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: sel }}
                          onPress={() => {
                            setCalendarDayIndex(i);
                            setSelectedSlotId(null);
                          }}
                          style={({ pressed }) => [
                            styles.dayChip,
                            sel && styles.dayChipOn,
                            pressed && styles.dayChipPressed,
                          ]}
                        >
                          <Text style={[styles.dayChipWeek, sel && styles.dayChipWeekOn]}>
                            {labelShort}
                          </Text>
                          <Text style={[styles.dayChipNum, sel && styles.dayChipNumOn]}>{num}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {(() => {
                    const selectedDayDate = weekDayDates[calendarDayIndex] ?? weekDayDates[0];
                    const loc = i18n.language.startsWith('tr') ? 'tr-TR' : undefined;
                    const longDay = selectedDayDate.toLocaleDateString(loc, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    });
                    return <Text style={styles.calendarSelectedDayLine}>{longDay}</Text>;
                  })()}
                  {loadingSlots ? (
                    <ActivityIndicator color={premium.accentBlue} style={styles.mb} />
                  ) : (
                    <View style={styles.hourList}>
                      {hourBuckets.map((h) => {
                        const selectedDayDate = weekDayDates[calendarDayIndex] ?? weekDayDates[0];
                        const slot = findSlotInBucket(
                          slots,
                          calendarTrainer.id,
                          selectedDayDate,
                          h,
                        );
                        const full = slot ? slot.remainingCapacity < 1 : false;
                        const sel = slot ? slot.id === selectedSlotId : false;
                        return (
                          <Pressable
                            key={`hour-${h}`}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: !slot || full, selected: sel }}
                            disabled={!slot || full}
                            onPress={() => {
                              if (slot && !full) {
                                setSelectedSlotId(slot.id);
                              }
                            }}
                            style={({ pressed }) => [
                              styles.hourCard,
                              sel && styles.hourCardOn,
                              full && styles.hourCardFull,
                              (!slot || full) && styles.hourCardMuted,
                              pressed && slot && !full && styles.hourCardPressed,
                            ]}
                          >
                            <Text style={styles.hourCardBucket}>{formatHourBucketLabel(h)}</Text>
                            {slot ? (
                              <>
                                <Text style={styles.hourCardSpan} numberOfLines={1}>
                                  {formatSlotTimeSpan(slot, i18n.language)}
                                </Text>
                                <Text style={styles.hourCardSpots}>
                                  {t('serviceHub.spotsLeft', { n: slot.remainingCapacity })}
                                </Text>
                              </>
                            ) : (
                              <Text style={styles.hourCardDash}>
                                {t('serviceHub.calendarNoSlot')}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  {!loadingSlots && slots.length === 0 ? (
                    <Text style={styles.muted}>{t('serviceHub.emptySlots')}</Text>
                  ) : null}
                  <Text style={styles.subLabel}>{t('serviceHub.selectPackage')}</Text>
                  {filteredPackages.map((p) => {
                    const sel = p.id === selectedPackageId;
                    return (
                      <Pressable
                        key={p.id}
                        style={[styles.pick, sel && styles.pickOn]}
                        onPress={() => setSelectedPackageId(p.id)}
                      >
                        <Text style={styles.pickTxt}>
                          {p.packageType.name} · {p.remainingSessions}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View
                  style={[
                    styles.calendarStickyFooter,
                    { paddingBottom: Math.max(insets.bottom, 12) },
                  ]}
                >
                  <Text style={styles.footerStatus}>
                    {selectedSlot
                      ? t('serviceHub.footerSlotSelected', {
                          time: formatSlotTimeSpan(selectedSlot, i18n.language),
                        })
                      : t('serviceHub.footerPickSlot')}
                  </Text>
                  {selectedPackageForFooter ? (
                    <Text style={styles.footerPackage} numberOfLines={2}>
                      {t('serviceHub.footerPackageLine', {
                        name: selectedPackageForFooter.packageType.name,
                        n: selectedPackageForFooter.remainingSessions,
                      })}
                    </Text>
                  ) : selectedSlot && filteredPackages.length > 0 ? (
                    <Text style={styles.footerNeedPackage}>
                      {t('serviceHub.footerNeedPackage')}
                    </Text>
                  ) : null}
                  <Pressable
                    {...ripple}
                    style={({ pressed }) => [
                      styles.btnPrimary,
                      pressed && styles.btnPrimaryPressed,
                      (!selectedSlotId ||
                        !selectedPackageId ||
                        booking ||
                        filteredPackages.length === 0) &&
                        styles.disabled,
                    ]}
                    disabled={
                      !selectedSlotId ||
                      !selectedPackageId ||
                      booking ||
                      filteredPackages.length === 0
                    }
                    onPress={() => {
                      confirmBook().catch(() => {});
                    }}
                  >
                    {booking ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnPrimaryTxt}>{t('serviceHub.confirmBook')}</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {showDatePicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={iosPickerValue}
          mode="date"
          display="default"
          minimumDate={new Date()}
          maximumDate={addDays(new Date(), 365)}
          onChange={onAndroidDateChange}
        />
      ) : null}

      <Modal
        visible={showDatePicker && Platform.OS === 'ios'}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={styles.datePickerBackdrop} onPress={() => setShowDatePicker(false)}>
          <View style={styles.datePickerSheet} onStartShouldSetResponder={() => true}>
            <DateTimePicker
              value={iosPickerValue}
              mode="date"
              display="spinner"
              themeVariant="dark"
              minimumDate={new Date()}
              maximumDate={addDays(new Date(), 365)}
              onChange={(_, d) => {
                if (d) {
                  setIosPickerValue(d);
                }
              }}
            />
            <View style={styles.datePickerActions}>
              <Pressable
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerCancelBtn}
              >
                <Text style={styles.datePickerCancelTxt}>{t('booking.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  applyPickedDate(iosPickerValue);
                  setShowDatePicker(false);
                }}
                style={styles.datePickerDoneBtn}
              >
                <Text style={styles.datePickerDoneTxt}>{t('serviceHub.datePickerDone')}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={packageRequestOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPackageRequestOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPackageRequestOpen(false)}>
          <Pressable style={styles.requestModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>{t(`${prefix}.requestTitle`)}</Text>
              <Pressable
                hitSlop={12}
                onPress={() => setPackageRequestOpen(false)}
                style={({ pressed }) => [styles.requestModalClose, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.requestModalCloseTxt}>×</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.muted}>{t(`${prefix}.requestHint`)}</Text>
              <TextInput
                value={requestNote}
                onChangeText={setRequestNote}
                placeholder={t(`${prefix}.requestPlaceholder`)}
                placeholderTextColor={premium.textMuted}
                multiline
                style={styles.textArea}
              />
              <Pressable
                {...ripple}
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
                onPress={() => {
                  sendPackageRequest().catch(() => {});
                }}
                disabled={requestSending}
              >
                {requestSending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryTxt}>{t('serviceHub.requestSend')}</Text>
                )}
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </GradientBackground>
  );
}

export function MemberSpecialLessonsScreen() {
  return <MemberServiceHubScreen mode="personal_training" />;
}

export function MemberMassageScreen() {
  return <MemberServiceHubScreen mode="massage" />;
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    flexGrow: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 14,
    color: premium.textMuted,
    marginBottom: 16,
  },
  mb: { marginBottom: 12 },
  card: { marginBottom: 12 },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
  },
  heroCredits: {
    fontSize: 20,
    fontWeight: '800',
    color: premium.accentGreen,
    marginBottom: 8,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  creditsLine: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: '800',
    color: premium.accentGreen,
  },
  addPackageBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: premium.accentGreen,
    backgroundColor: 'rgba(74,222,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPackageBtnPressed: {
    backgroundColor: 'rgba(74,222,128,0.28)',
  },
  addPackageIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: premium.accentGreen,
    marginTop: -2,
  },
  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: premium.textMuted,
    marginBottom: 6,
  },
  warn: {
    fontSize: 14,
    color: '#fbbf24',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    padding: 12,
    color: premium.text,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  btnPrimary: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: premium.radiusSm,
    backgroundColor: premium.accentBlue,
    marginTop: 4,
  },
  btnPrimaryPressed: { opacity: 0.9 },
  btnPrimaryTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.45 },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: premium.text,
    marginTop: 8,
    marginBottom: 10,
  },
  hRail: { marginBottom: 12, paddingBottom: 4 },
  staffCardOuter: {
    width: 176,
    marginRight: 12,
    borderRadius: premium.radiusMd,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.32)',
    overflow: 'hidden',
  },
  staffCardOuterPressed: { opacity: 0.92 },
  staffPhotoClip: {
    width: '100%',
    height: 108,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  staffHeroPhoto: {
    width: '100%',
    height: 108,
  },
  staffHeroPhotoPh: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  staffHeroLetter: {
    fontSize: 40,
    fontWeight: '800',
    color: premium.text,
  },
  staffCardInner: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  staffNameCard: {
    fontSize: 15,
    fontWeight: '800',
    color: premium.text,
    letterSpacing: -0.2,
  },
  staffStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  ratingPillTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fcd34d',
  },
  sessionsTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: premium.textMuted,
  },
  staffTeaserTxt: {
    fontSize: 11,
    lineHeight: 15,
    color: premium.textMuted,
  },
  staffFallbackHint: {
    fontSize: 11,
    lineHeight: 15,
    color: premium.accentBlue,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  weekBtnTxt: { color: premium.accentGreen, fontWeight: '700', fontSize: 12 },
  weekRange: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: premium.text,
    marginHorizontal: 6,
  },
  calendarModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  /** Tap outside the sheet to dismiss; must not wrap the sheet or scroll/touches break. */
  calendarModalDismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  calendarSheet: {
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  calendarHeaderTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  calendarModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: premium.text,
  },
  calendarModalSub: {
    fontSize: 13,
    color: premium.textMuted,
    marginTop: 2,
  },
  calendarHint: {
    fontSize: 12,
    color: premium.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  calendarScrollContent: {
    paddingBottom: 8,
    flexGrow: 0,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  todayShortcutBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  todayShortcutBtnPressed: { opacity: 0.88 },
  todayShortcutTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: premium.accentGreen,
  },
  pickDateBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
  },
  pickDateBtnPressed: { opacity: 0.88 },
  pickDateTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7dd3fc',
  },
  calendarStickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premium.glassBorder,
    paddingTop: 12,
    paddingHorizontal: 4,
    backgroundColor: '#0f172a',
  },
  footerStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: premium.text,
    marginBottom: 4,
  },
  footerPackage: {
    fontSize: 12,
    color: premium.textMuted,
    marginBottom: 8,
  },
  footerNeedPackage: {
    fontSize: 12,
    color: '#fcd34d',
    marginBottom: 8,
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  datePickerSheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: premium.glassBorder,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  datePickerCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  datePickerCancelTxt: {
    fontSize: 16,
    color: premium.textMuted,
    fontWeight: '600',
  },
  datePickerDoneBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  datePickerDoneTxt: {
    fontSize: 16,
    color: '#7dd3fc',
    fontWeight: '800',
  },
  calendarPickDayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dayChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
    paddingBottom: 12,
    justifyContent: 'flex-start',
  },
  dayChip: {
    minWidth: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  dayChipOn: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.2)',
  },
  dayChipPressed: { opacity: 0.85 },
  dayChipWeek: {
    fontSize: 11,
    fontWeight: '700',
    color: premium.textMuted,
    marginBottom: 2,
  },
  dayChipWeekOn: { color: premium.text },
  dayChipNum: {
    fontSize: 18,
    fontWeight: '800',
    color: premium.text,
  },
  dayChipNumOn: { color: '#7dd3fc' },
  calendarSelectedDayLine: {
    fontSize: 15,
    fontWeight: '700',
    color: premium.text,
    marginBottom: 12,
  },
  hourList: {
    marginBottom: 4,
  },
  hourCard: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minHeight: 72,
  },
  hourCardOn: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.18)',
  },
  hourCardFull: {
    opacity: 0.5,
  },
  hourCardMuted: {
    opacity: 0.4,
  },
  hourCardPressed: {
    opacity: 0.88,
  },
  hourCardBucket: {
    fontSize: 11,
    fontWeight: '800',
    color: premium.accentGreen,
    marginBottom: 4,
  },
  hourCardSpan: {
    fontSize: 11,
    color: premium.text,
    marginBottom: 2,
  },
  hourCardSpots: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fcd34d',
  },
  hourCardDash: {
    fontSize: 13,
    color: premium.textMuted,
    marginTop: 4,
  },
  slotRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  slotRowOn: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.15)',
  },
  slotDisabled: { opacity: 0.45 },
  slotTxt: { fontSize: 13, color: premium.text },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.textMuted,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pick: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  pickOn: {
    borderColor: premium.accentGreen,
    backgroundColor: 'rgba(74,222,128,0.12)',
  },
  pickTxt: { fontSize: 14, color: premium.text },
  resRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  resTxt: {
    flex: 1,
    fontSize: 13,
    marginRight: 8,
    color: premium.text,
  },
  pastLine: {
    fontSize: 13,
    color: premium.textMuted,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  btnDanger: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(248,113,113,0.35)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.55)',
  },
  btnDangerTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalSheet: {
    borderRadius: premium.radiusLg,
    backgroundColor: '#0b1224',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalProfileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  modalProfileTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    color: premium.text,
    lineHeight: 24,
  },
  modalCloseRound: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  modalCloseRoundTxt: {
    fontSize: 22,
    fontWeight: '400',
    color: premium.textMuted,
    marginTop: -2,
  },
  modalScroll: { maxHeight: '100%' },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalHeroImg: {
    width: '100%',
    height: 200,
    borderRadius: premium.radiusMd,
    marginBottom: 14,
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalHeroImgPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeroLetter: {
    fontSize: 56,
    fontWeight: '800',
    color: premium.text,
  },
  modalRatingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  modalRatingMain: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fcd34d',
  },
  modalSessionsMain: {
    fontSize: 14,
    fontWeight: '700',
    color: premium.textMuted,
  },
  modalMemberSince: {
    fontSize: 13,
    fontWeight: '600',
    color: premium.textMuted,
    marginBottom: 8,
  },
  modalDisclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(148,163,184,0.85)',
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: premium.textMuted,
    marginBottom: 8,
  },
  modalSectionBlock: {
    marginBottom: 14,
  },
  modalChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalChip: {
    maxWidth: '100%',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: premium.radiusSm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  modalChipTxt: {
    fontSize: 13,
    color: premium.text,
    fontWeight: '600',
  },
  modalBio: {
    fontSize: 15,
    lineHeight: 23,
    color: premium.text,
    marginBottom: 12,
  },
  modalMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: premium.textMuted,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  requestModalCard: {
    borderRadius: premium.radiusLg,
    padding: 18,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  requestModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  requestModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: premium.text,
  },
  requestModalClose: {
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  requestModalCloseTxt: {
    fontSize: 28,
    fontWeight: '400',
    color: premium.textMuted,
    lineHeight: 32,
  },
  btnOutline: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  btnOutlineTxt: {
    color: premium.accentGreen,
    fontWeight: '700',
    fontSize: 14,
  },
});
