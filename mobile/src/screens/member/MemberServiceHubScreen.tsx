import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type Props = { mode: ServiceHubMode };

export function MemberServiceHubScreen({ mode }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();

  const [packages, setPackages] = useState<MyPackageRow[]>([]);
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [reservations, setReservations] = useState<HubReservation[]>([]);
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
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

  const isPt = mode === 'personal_training';
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
      if (selectedTrainerId) {
        await loadSlotsForTrainer(selectedTrainerId, rangeStart, rangeEnd);
      }
    } catch (e) {
      Alert.alert(t('alerts.generic'), e instanceof ApiError ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [token, tenant, loadAll, selectedTrainerId, rangeStart, rangeEnd, loadSlotsForTrainer, t]);

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
    if (!selectedTrainerId || !token || !tenant) {
      return;
    }
    loadSlotsForTrainer(selectedTrainerId, rangeStart, rangeEnd).catch(() => {});
  }, [selectedTrainerId, rangeStart, rangeEnd, loadSlotsForTrainer, token, tenant]);

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
    if (!token || !tenant || !selectedSlotId || !selectedSlot) {
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
        await loadSlotsForTrainer(selectedTrainerId!, rangeStart, rangeEnd);
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
      if (selectedTrainerId) {
        await loadSlotsForTrainer(selectedTrainerId, rangeStart, rangeEnd);
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
    selectedTrainerId,
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
      Alert.alert(t('serviceHub.requestTitle'), t('serviceHub.requestOk'));
    } catch (e) {
      Alert.alert(
        t('serviceHub.requestTitle'),
        e instanceof ApiError ? e.message : t('serviceHub.requestFail'),
      );
    } finally {
      setRequestSending(false);
    }
  }, [token, tenant, requestNote, mode, t]);

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
        if (selectedTrainerId) {
          await loadSlotsForTrainer(selectedTrainerId, rangeStart, rangeEnd);
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
    [token, tenant, loadAll, selectedTrainerId, loadSlotsForTrainer, rangeStart, rangeEnd, t],
  );

  const ripple =
    Platform.OS === 'android' ? { android_ripple: { color: 'rgba(255,255,255,0.2)' } } : {};

  if (!token || !tenant) {
    return null;
  }

  const weekLabel = `${rangeStart.toLocaleDateString()} — ${addDays(rangeEnd, -1).toLocaleDateString()}`;

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
        {isPt ? null : (
          <>
            <Text style={styles.screenTitle}>{t(`${prefix}.screenTitle`)}</Text>
            <Text style={styles.screenSub}>{t(`${prefix}.screenSub`)}</Text>
          </>
        )}

        {loadingBoot ? <ActivityIndicator color={premium.accentBlue} style={styles.mb} /> : null}

        <GlassCard style={styles.card}>
          {isPt ? (
            <View style={styles.creditsRow}>
              <Text style={styles.creditsLine} accessibilityRole="text">
                {t('serviceHub.creditsLine', { n: credits })}
              </Text>
              <Pressable
                accessibilityLabel={t('serviceHub.addPackageA11y')}
                style={({ pressed }) => [
                  styles.addPackageBtn,
                  pressed && styles.addPackageBtnPressed,
                ]}
                onPress={() => setPackageRequestOpen(true)}
              >
                <Text style={styles.addPackageIcon}>+</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.cardTitle}>{t('serviceHub.summaryTitle')}</Text>
              <Text style={styles.heroCredits}>{t('serviceHub.creditsLine', { n: credits })}</Text>
            </>
          )}
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

        {!isPt ? (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>{t('serviceHub.requestTitle')}</Text>
            <Text style={styles.muted}>{t('serviceHub.requestHint')}</Text>
            <TextInput
              value={requestNote}
              onChangeText={setRequestNote}
              placeholder={t('serviceHub.requestPlaceholder')}
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
          </GlassCard>
        ) : null}

        <Text style={styles.sectionHeading}>{t(`${prefix}.staffTitle`)}</Text>
        {trainers.length === 0 ? (
          <Text style={styles.muted}>{t(`${prefix}.staffEmpty`)}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hRail}>
            {trainers.map((tr) => {
              const selected = tr.id === selectedTrainerId;
              return (
                <View key={tr.id} style={styles.staffCardWrap}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.staffCard,
                      selected && styles.staffCardOn,
                      pressed && styles.staffCardPressed,
                    ]}
                    onPress={() => setSelectedTrainerId(tr.id)}
                  >
                    {tr.photoUrl ? (
                      <Image source={{ uri: tr.photoUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPh]}>
                        <Text style={styles.avatarTxt}>
                          {(tr.user.firstName[0] ?? '?').toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.staffName} numberOfLines={1}>
                      {tr.user.firstName} {tr.user.lastName}
                    </Text>
                    <Text style={styles.staffMeta} numberOfLines={1}>
                      ★ {tr.avgRating} · {tr.totalSessions}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setProfileTrainer(tr)}>
                    <Text style={styles.profLink}>{t('serviceHub.viewProfile')}</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        )}

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('serviceHub.calendarTitle')}</Text>
          {selectedTrainerId ? (
            <>
              <View style={styles.weekRow}>
                <Pressable style={styles.weekBtn} onPress={() => setWeekOffset((w) => w - 1)}>
                  <Text style={styles.weekBtnTxt}>{t('serviceHub.weekPrev')}</Text>
                </Pressable>
                <Text style={styles.weekRange}>{weekLabel}</Text>
                <Pressable style={styles.weekBtn} onPress={() => setWeekOffset((w) => w + 1)}>
                  <Text style={styles.weekBtnTxt}>{t('serviceHub.weekNext')}</Text>
                </Pressable>
              </View>
              {loadingSlots ? (
                <ActivityIndicator color={premium.accentBlue} style={styles.mb} />
              ) : slots.length === 0 ? (
                <Text style={styles.muted}>{t('serviceHub.emptySlots')}</Text>
              ) : (
                slots.map((s) => {
                  const sel = s.id === selectedSlotId;
                  const full = s.remainingCapacity < 1;
                  return (
                    <Pressable
                      key={s.id}
                      style={[styles.slotRow, sel && styles.slotRowOn, full && styles.slotDisabled]}
                      disabled={full}
                      onPress={() => setSelectedSlotId(s.id)}
                    >
                      <Text style={styles.slotTxt}>
                        {fmt(s.startTime)} — {fmt(s.endTime)} ·{' '}
                        {t('serviceHub.spotsLeft', { n: s.remainingCapacity })}
                      </Text>
                    </Pressable>
                  );
                })
              )}
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
              <Pressable
                {...ripple}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  pressed && styles.btnPrimaryPressed,
                  (!selectedSlotId || booking || filteredPackages.length === 0) && styles.disabled,
                ]}
                disabled={!selectedSlotId || booking || filteredPackages.length === 0}
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
            </>
          ) : (
            <Text style={styles.muted}>{t('serviceHub.pickStaffFirst')}</Text>
          )}
        </GlassCard>

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

      <Modal visible={profileTrainer !== null} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setProfileTrainer(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {profileTrainer ? (
              <>
                <Text style={styles.modalTitle}>
                  {profileTrainer.user.firstName} {profileTrainer.user.lastName}
                </Text>
                {profileTrainer.photoUrl ? (
                  <Image source={{ uri: profileTrainer.photoUrl }} style={styles.modalPhoto} />
                ) : null}
                <Text style={styles.modalBio}>
                  {profileTrainer.bio?.trim() ? profileTrainer.bio : t('serviceHub.noBio')}
                </Text>
                {jsonToLines(profileTrainer.specializations) ? (
                  <Text style={styles.modalMeta}>
                    {t('serviceHub.spec')}: {jsonToLines(profileTrainer.specializations)}
                  </Text>
                ) : null}
                {jsonToLines(profileTrainer.certifications) ? (
                  <Text style={styles.modalMeta}>
                    {t('serviceHub.cert')}: {jsonToLines(profileTrainer.certifications)}
                  </Text>
                ) : null}
                <View style={styles.modalActions}>
                  <Pressable style={styles.btnOutline} onPress={() => setProfileTrainer(null)}>
                    <Text style={styles.btnOutlineTxt}>{t('serviceHub.profileClose')}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.btnPrimary}
                    onPress={() => {
                      setSelectedTrainerId(profileTrainer.id);
                      setProfileTrainer(null);
                    }}
                  >
                    <Text style={styles.btnPrimaryTxt}>{t('serviceHub.profilePick')}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={packageRequestOpen && isPt}
        transparent
        animationType="fade"
        onRequestClose={() => setPackageRequestOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPackageRequestOpen(false)}>
          <Pressable style={styles.requestModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>{t('serviceHub.requestTitle')}</Text>
              <Pressable
                hitSlop={12}
                onPress={() => setPackageRequestOpen(false)}
                style={({ pressed }) => [styles.requestModalClose, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.requestModalCloseTxt}>×</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.muted}>{t('serviceHub.requestHint')}</Text>
              <TextInput
                value={requestNote}
                onChangeText={setRequestNote}
                placeholder={t('serviceHub.requestPlaceholder')}
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
  hRail: { marginBottom: 12 },
  staffCardWrap: { marginRight: 10, width: 132 },
  profLink: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: premium.accentBlue,
    textAlign: 'center',
  },
  staffCard: {
    width: '100%',
    padding: 10,
    borderRadius: premium.radiusMd,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  staffCardOn: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  staffCardPressed: { opacity: 0.88 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: 8,
    alignSelf: 'center',
  },
  avatarPh: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 22, fontWeight: '800', color: premium.text },
  staffName: { fontSize: 14, fontWeight: '800', color: premium.text },
  staffMeta: { fontSize: 11, color: premium.textMuted, marginTop: 4 },
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
    padding: 20,
  },
  modalCard: {
    borderRadius: premium.radiusLg,
    padding: 18,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    maxHeight: '88%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 10,
  },
  modalPhoto: {
    width: '100%',
    height: 160,
    borderRadius: premium.radiusMd,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalBio: {
    fontSize: 15,
    lineHeight: 22,
    color: premium.text,
    marginBottom: 10,
  },
  modalMeta: {
    fontSize: 13,
    color: premium.textMuted,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    justifyContent: 'flex-end',
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
