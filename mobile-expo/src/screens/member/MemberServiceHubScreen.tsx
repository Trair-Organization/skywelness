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
  assignedTrainerId?: string | null;
  packageType: { id: string; name: string; sessionType: string };
};

type HubReservation = {
  id: string;
  status: string;
  sessionType: string;
  startTime: string;
  endTime: string;
  trainer: { user: { firstName: string; lastName: string } } | null;
  package: {
    remainingSessions: number;
    status: string;
    packageTypeName: string;
  } | null;
  spaTherapist?: { id: string; name: string } | null;
  spaService?: { id: string; name: string; durationMinutes: number } | null;
};

const TAB_BAR_PAD = 72;

/** Published slots are shown in 1-hour buckets from club opening through last start hour. */
const CLUB_OPEN_HOUR = 6;
const CLUB_LAST_START_HOUR = 21;

/** Calendar strip shows this many consecutive days, never before local today. */
const CALENDAR_VISIBLE_DAYS = 6;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Whole days from local today’s midnight to `target`’s date (can be negative). */
function daysFromTodayStart(target: Date): number {
  const t0 = startOfLocalDay(new Date()).getTime();
  const d0 = startOfLocalDay(target).getTime();
  return Math.round((d0 - t0) / (24 * 60 * 60 * 1000));
}

/** True if the start of the hour bucket (local) is already in the past. */
function isBucketStartInPast(day: Date, bucketHour: number): boolean {
  const t = new Date(day);
  t.setHours(bucketHour, 0, 0, 0);
  return t.getTime() < Date.now();
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
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

/** Slot whose local start time falls on `day` and starts in hour `bucketHour` (e.g. 6 → 06:00–07:00). */
function findSlotInBucket(
  rows: SlotRow[],
  trainerId: string,
  day: Date,
  bucketHour: number,
): SlotRow | null {
  const dayStart = startOfLocalDay(day);
  const windowStart = new Date(dayStart);
  windowStart.setHours(bucketHour, 0, 0, 0);
  const windowEnd = new Date(dayStart);
  windowEnd.setHours(bucketHour + 1, 0, 0, 0);
  const w0 = windowStart.getTime();
  const w1 = windowEnd.getTime();

  let best: SlotRow | null = null;
  let bestT = Infinity;
  for (const s of rows) {
    if (s.trainerId !== trainerId) {
      continue;
    }
    const st = new Date(s.startTime);
    if (!sameLocalCalendarDay(st, day)) {
      continue;
    }
    const t0 = st.getTime();
    if (t0 >= w0 && t0 < w1) {
      if (t0 < bestT) {
        bestT = t0;
        best = s;
      }
    }
  }
  return best;
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
  const [allTrainers, setAllTrainers] = useState<TrainerRow[]>([]);
  const [reservations, setReservations] = useState<HubReservation[]>([]);
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /**
   * Slides the visible 6-day window forward in steps of `CALENDAR_VISIBLE_DAYS` from local today
   * (page 0 = today … today+5).
   */
  const [sixDayPage, setSixDayPage] = useState(0);
  /** When set, full weekly calendar modal is open for this trainer. */
  const [calendarTrainer, setCalendarTrainer] = useState<TrainerRow | null>(null);
  /** 0–5: day index within the current 6-day strip. */
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
  const [packageRequestTrainerId, setPackageRequestTrainerId] = useState<string | null>(null);
  const [trainerRequestPickerOpen, setTrainerRequestPickerOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [iosPickerValue, setIosPickerValue] = useState(() => new Date());
  const suppressCalendarDaySyncRef = useRef(false);

  const prefix = mode === 'personal_training' ? 'serviceHub.pt' : 'serviceHub.massage';

  const credits = useMemo(() => sumRemainingForType(packages, mode), [packages, mode]);

  const packageRequestTrainerLabel = useMemo(() => {
    if (!packageRequestTrainerId) {
      return null;
    }
    const tr = allTrainers.find((row) => row.id === packageRequestTrainerId);
    return tr ? `${tr.user.firstName} ${tr.user.lastName}`.trim() : null;
  }, [allTrainers, packageRequestTrainerId]);

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

  const visibleDayDates = useMemo(() => {
    const todayStart = startOfLocalDay(new Date());
    const windowStart = addDays(todayStart, sixDayPage * CALENDAR_VISIBLE_DAYS);
    return Array.from({ length: CALENDAR_VISIBLE_DAYS }, (_, i) => addDays(windowStart, i));
  }, [sixDayPage]);

  const rangeStart = visibleDayDates[0] ?? startOfLocalDay(new Date());

  const rangeEnd = useMemo(() => addDays(rangeStart, CALENDAR_VISIBLE_DAYS), [rangeStart]);

  const loadAll = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    const q = new URLSearchParams({ sessionType: mode });
    const [pkgs, trs, trsAll, resv] = await Promise.all([
      apiJson<MyPackageRow[]>('/my-packages', { token, tenantSubdomain: tenant.subdomain }),
      apiJson<TrainerRow[]>(`/trainers?${q}`, { token, tenantSubdomain: tenant.subdomain }),
      apiJson<TrainerRow[]>('/trainers', { token, tenantSubdomain: tenant.subdomain }),
      apiJson<HubReservation[]>(`/reservations?limit=50&sessionType=${mode}`, {
        token,
        tenantSubdomain: tenant.subdomain,
      }),
    ]);
    setPackages(pkgs);
    setTrainers(trs);
    setAllTrainers(trsAll);
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
        setSelectedSlotId((prev) => {
          if (!prev) {
            return null;
          }
          return rows.some((s) => s.id === prev) ? prev : null;
        });
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
  }, [sixDayPage]);

  useEffect(() => {
    if (!calendarTrainer) {
      return;
    }
    if (suppressCalendarDaySyncRef.current) {
      suppressCalendarDaySyncRef.current = false;
      return;
    }
    setCalendarDayIndex(0);
  }, [calendarTrainer, sixDayPage]);

  /** Ensure an eligible package is selected for the currently opened trainer. */
  useEffect(() => {
    if (!calendarTrainer) {
      return;
    }
    const eligible = filteredPackages.filter(
      (pkg) => !pkg.assignedTrainerId || pkg.assignedTrainerId === calendarTrainer.id,
    );
    if (eligible.length === 0) {
      return;
    }
    setSelectedPackageId((prev) => {
      if (prev && eligible.some((p) => p.id === prev)) {
        return prev;
      }
      return eligible[0]?.id ?? null;
    });
  }, [calendarTrainer, filteredPackages]);

  useEffect(() => {
    if (!packageRequestOpen) {
      setPackageRequestTrainerId(null);
      setTrainerRequestPickerOpen(false);
    }
  }, [packageRequestOpen]);

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
          preferredTrainerId: packageRequestTrainerId ?? undefined,
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
  }, [token, tenant, requestNote, mode, t, prefix, packageRequestTrainerId]);

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
    const delta = Math.max(0, daysFromTodayStart(d));
    suppressCalendarDaySyncRef.current = true;
    setSixDayPage(Math.floor(delta / CALENDAR_VISIBLE_DAYS));
    setCalendarDayIndex(delta % CALENDAR_VISIBLE_DAYS);
    setSelectedSlotId(null);
  }, []);

  const jumpToToday = useCallback(() => {
    suppressCalendarDaySyncRef.current = true;
    setSixDayPage(0);
    setCalendarDayIndex(0);
    setSelectedSlotId(null);
  }, []);

  const openDatePicker = useCallback(() => {
    const base = visibleDayDates[calendarDayIndex] ?? visibleDayDates[0];
    if (base) {
      setIosPickerValue(base);
    }
    setShowDatePicker(true);
  }, [visibleDayDates, calendarDayIndex]);

  const onAndroidDateChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      setShowDatePicker(false);
      if (event.type === 'set' && date) {
        applyPickedDate(date);
      }
    },
    [applyPickedDate],
  );

  const weekLabel = (() => {
    const a = visibleDayDates[0];
    const b = visibleDayDates[CALENDAR_VISIBLE_DAYS - 1];
    if (!a || !b) {
      return '';
    }
    return `${a.toLocaleDateString()} — ${b.toLocaleDateString()}`;
  })();

  const hourBuckets = useMemo(
    () =>
      Array.from(
        { length: CLUB_LAST_START_HOUR - CLUB_OPEN_HOUR + 1 },
        (_, i) => CLUB_OPEN_HOUR + i,
      ),
    [],
  );

  const windowHeight = Dimensions.get('window').height;

  const calendarEligiblePackages = useMemo(() => {
    if (!calendarTrainer) {
      return filteredPackages;
    }
    return filteredPackages.filter(
      (pkg) => !pkg.assignedTrainerId || pkg.assignedTrainerId === calendarTrainer.id,
    );
  }, [filteredPackages, calendarTrainer]);

  const selectedPackageForFooter = useMemo(
    () => calendarEligiblePackages.find((p) => p.id === selectedPackageId) ?? null,
    [calendarEligiblePackages, selectedPackageId],
  );

  const canConfirmCalendarBooking = useMemo(
    () =>
      Boolean(selectedSlotId) &&
      Boolean(selectedPackageId) &&
      calendarEligiblePackages.length > 0 &&
      !booking,
    [selectedSlotId, selectedPackageId, calendarEligiblePackages.length, booking],
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
              onPress={() => {
                setPackageRequestOpen(true);
              }}
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
                    {fmt(r.startTime)} ·{' '}
                    {r.trainer
                      ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`
                      : (r.spaTherapist?.name ?? '')}{' '}
                    · {r.package?.packageTypeName ?? r.spaService?.name ?? ''}
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
                {fmt(r.startTime)} ·{' '}
                {r.trainer
                  ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`
                  : (r.spaTherapist?.name ?? '')}{' '}
                · {r.status}
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
                        suppressCalendarDaySyncRef.current = true;
                        setSixDayPage(0);
                        setCalendarDayIndex(0);
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
                  keyboardShouldPersistTaps="always"
                  nestedScrollEnabled
                  removeClippedSubviews={false}
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
                    <Pressable
                      style={({ pressed }) => [
                        styles.weekBtn,
                        sixDayPage === 0 && styles.weekBtnDisabled,
                        pressed && sixDayPage > 0 && styles.weekBtnPressed,
                      ]}
                      disabled={sixDayPage === 0}
                      onPress={() => setSixDayPage((p) => Math.max(0, p - 1))}
                    >
                      <Text
                        style={[styles.weekBtnTxt, sixDayPage === 0 && styles.weekBtnTxtDisabled]}
                      >
                        {t('serviceHub.weekPrev')}
                      </Text>
                    </Pressable>
                    <Text style={styles.weekRange}>{weekLabel}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.weekBtn, pressed && styles.weekBtnPressed]}
                      onPress={() => setSixDayPage((p) => p + 1)}
                    >
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
                    {visibleDayDates.map((dayDate, i) => {
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
                    const selectedDayDate = visibleDayDates[calendarDayIndex] ?? visibleDayDates[0];
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
                        const selectedDayDate =
                          visibleDayDates[calendarDayIndex] ?? visibleDayDates[0];
                        const slot = findSlotInBucket(
                          slots,
                          calendarTrainer.id,
                          selectedDayDate,
                          h,
                        );
                        const full = slot ? slot.remainingCapacity < 1 : false;
                        const past = isBucketStartInPast(selectedDayDate, h);
                        const sel = slot ? slot.id === selectedSlotId : false;
                        const canBook = Boolean(slot && !full && !past);
                        const cardStyle = [
                          styles.hourCard,
                          sel && styles.hourCardOn,
                          !slot && styles.hourCardEmpty,
                          past && styles.hourCardPast,
                          Boolean(slot && full) && styles.hourCardFull,
                          !canBook && !sel && Boolean(slot) && styles.hourCardMuted,
                        ];
                        const inner = (
                          <>
                            <Text style={styles.hourCardBucket}>{formatHourBucketLabel(h)}</Text>
                            {past ? (
                              <Text style={styles.hourCardDash}>{t('serviceHub.slotPast')}</Text>
                            ) : slot ? (
                              <>
                                <Text style={styles.hourCardSpan} numberOfLines={1}>
                                  {formatSlotTimeSpan(slot, i18n.language)}
                                </Text>
                                <Text
                                  style={[styles.hourCardSpots, full && styles.hourCardSpotsFull]}
                                >
                                  {full
                                    ? t('serviceHub.slotFull')
                                    : t('serviceHub.spotsLeft', { n: slot.remainingCapacity })}
                                </Text>
                              </>
                            ) : (
                              <>
                                <Text style={styles.hourCardEmptyBadge}>
                                  {t('serviceHub.noSlotBadge')}
                                </Text>
                                <Text style={styles.hourCardDash}>
                                  {t('serviceHub.calendarNoSlotDetail')}
                                </Text>
                              </>
                            )}
                          </>
                        );
                        if (canBook && slot) {
                          return (
                            <Pressable
                              key={`hour-${h}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected: sel }}
                              hitSlop={6}
                              {...(Platform.OS === 'android'
                                ? { android_ripple: { color: 'rgba(255,255,255,0.18)' } }
                                : {})}
                              style={({ pressed }) => [
                                ...cardStyle,
                                pressed ? styles.hourCardPressed : null,
                              ]}
                              onPress={() => setSelectedSlotId(slot.id)}
                            >
                              {inner}
                            </Pressable>
                          );
                        }
                        const onBlockedHourPress = () => {
                          if (!slot) {
                            Alert.alert(
                              t('serviceHub.emptyHourAlertTitle'),
                              t('serviceHub.emptyHourAlertBody'),
                            );
                          } else if (past) {
                            Alert.alert(
                              t('serviceHub.pastHourAlertTitle'),
                              t('serviceHub.pastHourAlertBody'),
                            );
                          } else if (full) {
                            Alert.alert(
                              t('serviceHub.fullHourAlertTitle'),
                              t('serviceHub.fullHourAlertBody'),
                            );
                          }
                        };
                        return (
                          <Pressable
                            key={`hour-${h}`}
                            accessibilityRole="button"
                            hitSlop={4}
                            {...(Platform.OS === 'android'
                              ? { android_ripple: { color: 'rgba(255,255,255,0.12)' } }
                              : {})}
                            style={({ pressed }) => [
                              ...cardStyle,
                              pressed ? styles.hourCardPressed : null,
                            ]}
                            onPress={onBlockedHourPress}
                          >
                            {inner}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  {!loadingSlots && slots.length === 0 ? (
                    <Text style={styles.muted}>{t('serviceHub.emptySlots')}</Text>
                  ) : null}
                  <Text style={styles.subLabel}>{t('serviceHub.selectPackage')}</Text>
                  {calendarEligiblePackages.map((p) => {
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
                  ) : selectedSlot &&
                    calendarEligiblePackages.length === 0 &&
                    filteredPackages.length > 0 ? (
                    <Text style={styles.footerNeedPackage}>
                      {t('serviceHub.footerNeedEligiblePackage')}
                    </Text>
                  ) : selectedSlot && calendarEligiblePackages.length > 0 ? (
                    <Text style={styles.footerNeedPackage}>
                      {t('serviceHub.footerNeedPackage')}
                    </Text>
                  ) : null}
                  <Pressable
                    {...ripple}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: booking }}
                    style={({ pressed }) => [
                      styles.btnPrimary,
                      pressed && canConfirmCalendarBooking && styles.btnPrimaryPressed,
                      !canConfirmCalendarBooking && styles.disabled,
                    ]}
                    disabled={booking}
                    onPress={() => {
                      if (booking) {
                        return;
                      }
                      if (!selectedSlotId) {
                        Alert.alert(
                          t('serviceHub.bookingNeedSlotTitle'),
                          t('serviceHub.bookingNeedSlotBody'),
                        );
                        return;
                      }
                      if (!canConfirmCalendarBooking) {
                        Alert.alert(
                          t('serviceHub.noRightsBookingTitle'),
                          t('serviceHub.noRightsBookingBody'),
                          [
                            {
                              text: t('serviceHub.noRightsAlertClose'),
                              style: 'cancel',
                            },
                            {
                              text: t('serviceHub.noRightsOpenRequest'),
                              onPress: () => {
                                setShowDatePicker(false);
                                setCalendarTrainer(null);
                                setSelectedSlotId(null);
                                setPackageRequestOpen(true);
                              },
                            },
                          ],
                        );
                        return;
                      }
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
          <View style={styles.datePickerSheet}>
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
          <View style={styles.requestModalCard}>
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
            {credits <= 0 ? (
              <View style={styles.requestZeroCreditsBanner}>
                <Text style={styles.requestZeroCreditsBannerTitle}>
                  {t('serviceHub.packageRequestBannerZeroTitle')}
                </Text>
                <Text style={styles.requestZeroCreditsBannerBody}>
                  {t(
                    mode === 'massage'
                      ? 'serviceHub.packageRequestBannerZeroBodyMassage'
                      : 'serviceHub.packageRequestBannerZeroBodyPt',
                  )}
                </Text>
              </View>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
              {allTrainers.length > 0 ? (
                <View style={styles.requestTrainerBlock}>
                  <Text style={styles.requestTrainerFieldLabel}>
                    {mode === 'massage'
                      ? t('serviceHub.requestPickTrainerLabelMassage')
                      : t('serviceHub.requestPickTrainerLabelPt')}
                  </Text>
                  <Text style={styles.requestTrainerFieldHint}>
                    {t('serviceHub.requestPickTrainerHint')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTrainerRequestPickerOpen(true)}
                    style={({ pressed }) => [
                      styles.requestTrainerField,
                      pressed && styles.requestTrainerFieldPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.requestTrainerFieldValue,
                        !packageRequestTrainerLabel && styles.requestTrainerFieldPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {packageRequestTrainerLabel ?? t('serviceHub.requestPickTrainerPlaceholder')}
                    </Text>
                    <Text style={styles.requestTrainerChevron}>▾</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.muted}>{t('serviceHub.requestNoStaffForPicker')}</Text>
              )}
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
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={trainerRequestPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTrainerRequestPickerOpen(false)}
      >
        <View style={styles.trainerPickerBackdrop}>
          <Pressable
            style={styles.trainerPickerDismiss}
            onPress={() => setTrainerRequestPickerOpen(false)}
          />
          <View style={styles.trainerPickerSheet}>
            <Text style={styles.trainerPickerTitle}>
              {t('serviceHub.requestPickTrainerSheetTitle')}
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="always"
              style={styles.trainerPickerList}
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.trainerPickerRow,
                  pressed && styles.trainerPickerRowPressed,
                ]}
                onPress={() => {
                  setPackageRequestTrainerId(null);
                  setTrainerRequestPickerOpen(false);
                }}
              >
                <Text style={styles.trainerPickerRowTxt}>
                  {t('serviceHub.requestPickTrainerNone')}
                </Text>
              </Pressable>
              {allTrainers.map((tr) => {
                const name = `${tr.user.firstName} ${tr.user.lastName}`.trim();
                const sel = tr.id === packageRequestTrainerId;
                return (
                  <Pressable
                    key={tr.id}
                    style={({ pressed }) => [
                      styles.trainerPickerRow,
                      sel && styles.trainerPickerRowOn,
                      pressed && styles.trainerPickerRowPressed,
                    ]}
                    onPress={() => {
                      setPackageRequestTrainerId(tr.id);
                      setTrainerRequestPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.trainerPickerRowTxt, sel && styles.trainerPickerRowTxtOn]}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
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
  weekBtnDisabled: {
    opacity: 0.35,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  weekBtnPressed: { opacity: 0.88 },
  weekBtnTxtDisabled: {
    color: premium.textMuted,
  },
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
    zIndex: 0,
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
    flexWrap: 'nowrap',
    gap: 6,
    paddingVertical: 4,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  dayChip: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
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
    opacity: 0.65,
  },
  hourCardMuted: {
    opacity: 0.55,
  },
  hourCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  hourCardPast: {
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  hourCardEmpty: {
    borderStyle: 'dashed',
    borderColor: 'rgba(148,163,184,0.45)',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  hourCardEmptyBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: premium.textMuted,
    marginBottom: 4,
  },
  hourCardSpotsFull: {
    color: '#f87171',
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
  requestZeroCreditsBanner: {
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.45)',
    backgroundColor: 'rgba(251,191,36,0.12)',
    padding: 12,
    marginBottom: 12,
  },
  requestZeroCreditsBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fcd34d',
    marginBottom: 6,
  },
  requestZeroCreditsBannerBody: {
    fontSize: 13,
    lineHeight: 19,
    color: premium.text,
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
  requestTrainerBlock: {
    marginBottom: 12,
  },
  requestTrainerFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  requestTrainerFieldHint: {
    fontSize: 12,
    lineHeight: 17,
    color: premium.textMuted,
    marginBottom: 8,
  },
  requestTrainerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.22)',
    gap: 8,
  },
  requestTrainerFieldPressed: {
    opacity: 0.88,
  },
  requestTrainerFieldValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '600',
    color: premium.text,
  },
  requestTrainerFieldPlaceholder: {
    color: premium.textMuted,
    fontWeight: '500',
  },
  requestTrainerChevron: {
    fontSize: 14,
    color: premium.accentGreen,
  },
  trainerPickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  trainerPickerDismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  trainerPickerSheet: {
    zIndex: 2,
    elevation: 16,
    maxHeight: '72%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 24,
    paddingTop: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  trainerPickerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 10,
  },
  trainerPickerList: {
    maxHeight: 420,
  },
  trainerPickerRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  trainerPickerRowOn: {
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
    paddingLeft: 9,
  },
  trainerPickerRowPressed: {
    opacity: 0.85,
  },
  trainerPickerRowTxt: {
    fontSize: 16,
    color: premium.text,
    fontWeight: '600',
  },
  trainerPickerRowTxtOn: {
    color: '#7dd3fc',
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
