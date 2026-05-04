import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../api/client';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { GradientBackground } from '../components/premium/GradientBackground';
import { GlassCard } from '../components/premium/GlassCard';
import { persistLanguage } from '../i18n';
import { premium } from '../theme/premiumTheme';

type TrainerRow = {
  id: string;
  tenantId: string;
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

type ReservationRow = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  trainer: { user: { firstName: string; lastName: string } };
  timeSlot: { id: string; startTime: string; endTime: string };
  package: { remainingSessions: number; status: string };
};

type MyPackageRow = {
  id: string;
  remainingSessions: number;
  expiresAt: string;
  status: string;
  packageType: { id: string; name: string; sessionType: string };
};

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

function pickDefaultPackageId(rows: MyPackageRow[]): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const usable = rows.find(
    (p) =>
      p.status === 'active' &&
      p.remainingSessions > 0 &&
      typeof p.expiresAt === 'string' &&
      p.expiresAt >= today,
  );
  return usable?.id ?? rows[0]?.id ?? null;
}

const logoDark = require('../../assets/branding/wellness-club-logo-header-dark.png');

export function MemberDashboardScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant, user, logout } = useMemberAuth();

  const [packages, setPackages] = useState<MyPackageRow[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingRes, setLoadingRes] = useState(false);
  const [booking, setBooking] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setLoadingPackages(true);
    try {
      const rows = await apiJson<MyPackageRow[]>('/my-packages', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setPackages(rows);
      setSelectedPackageId((prev) => prev ?? pickDefaultPackageId(rows));
    } catch (e) {
      Alert.alert(
        t('alerts.packages'),
        e instanceof ApiError ? e.message : t('alerts.packagesErr'),
      );
    } finally {
      setLoadingPackages(false);
    }
  }, [token, tenant, t]);

  useEffect(() => {
    if (token && tenant) {
      loadPackages().catch(() => {});
    }
  }, [token, tenant, loadPackages]);

  const loadReservations = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setLoadingRes(true);
    try {
      const rows = await apiJson<ReservationRow[]>('/reservations?limit=20', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setReservations(rows);
    } catch (e) {
      Alert.alert(
        t('alerts.reservations'),
        e instanceof ApiError ? e.message : t('alerts.reservationsErr'),
      );
    } finally {
      setLoadingRes(false);
    }
  }, [token, tenant, t]);

  const loadTrainers = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setLoadingTrainers(true);
    try {
      const rows = await apiJson<TrainerRow[]>('/trainers', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setTrainers(rows);
      setSelectedTrainerId((prev) => prev ?? rows[0]?.id ?? null);
    } catch (e) {
      Alert.alert(
        t('alerts.trainers'),
        e instanceof ApiError ? e.message : t('alerts.trainersErr'),
      );
    } finally {
      setLoadingTrainers(false);
    }
  }, [token, tenant, t]);

  const loadAvailability = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    if (!selectedTrainerId) {
      Alert.alert(t('alerts.availability'), t('booking.pickTrainerFirst'));
      return;
    }
    const from = new Date();
    const to = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    setLoadingSlots(true);
    try {
      const q = new URLSearchParams({
        trainerId: selectedTrainerId,
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
  }, [token, tenant, selectedTrainerId, t]);

  const bookSlot = useCallback(async () => {
    if (!token || !tenant || !selectedSlotId) {
      Alert.alert(t('booking.section'), t('booking.pickSlotFirst'));
      return;
    }
    const pkgId = selectedPackageId;
    if (!pkgId) {
      Alert.alert(
        t('booking.section'),
        packages.length ? t('booking.pickPackageFirst') : t('booking.noPackages'),
      );
      return;
    }
    setBooking(true);
    try {
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
      await loadReservations();
      await loadAvailability();
      await loadPackages();
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
    selectedPackageId,
    packages,
    loadReservations,
    loadAvailability,
    loadPackages,
    t,
  ]);

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
        await loadReservations();
        await loadAvailability();
        await loadPackages();
      } catch (e) {
        Alert.alert(
          t('booking.section'),
          e instanceof ApiError ? e.message : t('booking.cancelFailed'),
        );
      } finally {
        setCancellingId(null);
      }
    },
    [token, tenant, loadReservations, loadAvailability, loadPackages, t],
  );

  const ripple =
    Platform.OS === 'android' ? { android_ripple: { color: 'rgba(255,255,255,0.2)' } } : {};

  if (!user || !token || !tenant) {
    return null;
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={t('appTitle')}
              source={logoDark}
              style={styles.heroLogo}
            />
            <View style={styles.heroTextCol}>
              <Text style={styles.heroBrand}>{t('appTitle')}</Text>
              <Text style={styles.heroTag}>{t('home.tagline')}</Text>
            </View>
          </View>
          <View style={styles.langRow}>
            <Text style={styles.langLabel}>{t('lang.label')}</Text>
            <View style={styles.langSeg}>
              <Pressable
                accessibilityRole="button"
                style={[styles.langBtn, i18n.language === 'tr' && styles.langBtnOn]}
                onPress={() => {
                  persistLanguage('tr').catch(() => {});
                }}
              >
                <Text style={[styles.langTxt, i18n.language === 'tr' && styles.langTxtOn]}>
                  {t('lang.tr')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.langBtn, i18n.language === 'en' && styles.langBtnOn]}
                onPress={() => {
                  persistLanguage('en').catch(() => {});
                }}
              >
                <Text style={[styles.langTxt, i18n.language === 'en' && styles.langTxtOn]}>
                  {t('lang.en')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <GlassCard>
          <Text style={styles.cardTitle}>{t('session.title')}</Text>
          <Text style={styles.cardLine}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.cardLine}>{user.email}</Text>
          <Text style={styles.cardLine}>{t('session.role', { role: user.role })}</Text>
          <Text style={styles.cardLineMuted}>
            {tenant.name} · {tenant.subdomain}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
            onPress={() => {
              logout().catch(() => {});
            }}
          >
            <Text style={styles.btnGhostTxt}>{t('session.logout')}</Text>
          </Pressable>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.cardTitle}>{t('booking.section')}</Text>
          <Text style={styles.muted}>{t('booking.packageHint')}</Text>

          <Pressable
            {...ripple}
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
            onPress={() => {
              loadPackages().catch(() => {});
            }}
            disabled={loadingPackages}
          >
            {loadingPackages ? (
              <ActivityIndicator color={premium.accentBlue} />
            ) : (
              <Text style={styles.btnOutlineTxt}>{t('booking.loadPackages')}</Text>
            )}
          </Pressable>

          {packages.length === 0 ? (
            <Text style={styles.warn}>{t('booking.noPackages')}</Text>
          ) : (
            <>
              <Text style={styles.subLabel}>{t('booking.pickPackage')}</Text>
              {packages.map((p) => {
                const selected = p.id === selectedPackageId;
                return (
                  <Pressable
                    key={p.id}
                    style={[styles.pick, selected && styles.pickOn]}
                    onPress={() => setSelectedPackageId(p.id)}
                  >
                    <Text style={styles.pickTxt}>
                      {p.packageType.name} · {p.remainingSessions} · {p.status}
                    </Text>
                  </Pressable>
                );
              })}
            </>
          )}

          <Pressable
            {...ripple}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.btnPrimaryPressed,
              loadingTrainers && styles.disabled,
            ]}
            onPress={() => {
              loadTrainers().catch(() => {});
            }}
            disabled={loadingTrainers}
          >
            {loadingTrainers ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryTxt}>{t('booking.listTrainers')}</Text>
            )}
          </Pressable>

          {trainers.map((tr) => {
            const selected = tr.id === selectedTrainerId;
            return (
              <Pressable
                key={tr.id}
                style={[styles.pick, selected && styles.pickOn]}
                onPress={() => setSelectedTrainerId(tr.id)}
              >
                <Text style={styles.pickTxt}>
                  {tr.user.firstName} {tr.user.lastName}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            {...ripple}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.btnPrimaryPressed,
              (!selectedTrainerId || loadingSlots) && styles.disabled,
            ]}
            onPress={() => {
              loadAvailability().catch(() => {});
            }}
            disabled={!selectedTrainerId || loadingSlots}
          >
            {loadingSlots ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryTxt}>{t('booking.loadAvailability')}</Text>
            )}
          </Pressable>

          <Text style={styles.subLabel}>{t('booking.slotsTitle')}</Text>
          {slots.length === 0 ? <Text style={styles.muted}>{t('booking.emptySlots')}</Text> : null}
          {slots.map((s) => {
            const selected = s.id === selectedSlotId;
            return (
              <Pressable
                key={s.id}
                style={[styles.pick, selected && styles.pickOn]}
                onPress={() => setSelectedSlotId(s.id)}
              >
                <Text style={styles.pickTxt}>
                  {fmt(s.startTime)} — {fmt(s.endTime)} · {s.remainingCapacity}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            {...ripple}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.btnPrimaryPressed,
              (!selectedSlotId || booking) && styles.disabled,
            ]}
            onPress={() => {
              bookSlot().catch(() => {});
            }}
            disabled={!selectedSlotId || booking}
          >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryTxt}>{t('booking.book')}</Text>
            )}
          </Pressable>

          <Text style={styles.subLabel}>{t('booking.reservations')}</Text>
          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
            onPress={() => {
              loadReservations().catch(() => {});
            }}
            disabled={loadingRes}
          >
            {loadingRes ? (
              <ActivityIndicator color={premium.accentGreen} />
            ) : (
              <Text style={styles.btnOutlineTxt}>{t('booking.refreshRes')}</Text>
            )}
          </Pressable>

          {reservations.map((r) => {
            const canCancel =
              (r.status === 'confirmed' || r.status === 'pending') &&
              new Date(r.startTime) > new Date();
            return (
              <View key={r.id} style={styles.resRow}>
                <Text style={styles.resTxt}>
                  {fmt(r.startTime)} · {r.trainer.user.firstName} {r.trainer.user.lastName} ·{' '}
                  {r.status}
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
          })}
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    flexGrow: 1,
  },
  hero: {
    marginBottom: 16,
    padding: 18,
    borderRadius: premium.radiusLg,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  heroTextCol: { flex: 1, minWidth: 0 },
  heroBrand: {
    fontSize: 22,
    fontWeight: '800',
    color: premium.text,
    letterSpacing: -0.3,
  },
  heroTag: {
    marginTop: 4,
    fontSize: 13,
    color: premium.textMuted,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  langLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: premium.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  langSeg: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  langBtnOn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  langTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: premium.textMuted,
  },
  langTxtOn: {
    color: premium.text,
  },
  sectionCard: {
    marginTop: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
  },
  cardLine: {
    fontSize: 15,
    color: premium.text,
    marginBottom: 4,
  },
  cardLineMuted: {
    fontSize: 13,
    color: premium.textMuted,
    marginBottom: 14,
    marginTop: 4,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    color: premium.textMuted,
    marginBottom: 12,
  },
  btnGhost: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  btnGhostPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnGhostTxt: {
    color: premium.textMuted,
    fontWeight: '700',
    fontSize: 15,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6,
    color: premium.text,
  },
  warn: {
    fontSize: 13,
    lineHeight: 18,
    color: '#fbbf24',
    backgroundColor: 'rgba(251,191,36,0.12)',
    padding: 12,
    borderRadius: premium.radiusSm,
    marginBottom: 12,
    overflow: 'hidden',
  },
  btnOutline: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  btnOutlinePressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnOutlineTxt: {
    color: premium.accentBlue,
    fontWeight: '700',
    fontSize: 15,
  },
  btnPrimary: {
    backgroundColor: 'rgba(56,189,248,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.5)',
    borderRadius: premium.radiusSm,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 50,
  },
  btnPrimaryPressed: {
    backgroundColor: 'rgba(56,189,248,0.5)',
  },
  btnPrimaryTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.45,
  },
  pick: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  pickOn: {
    borderColor: premium.accentGreen,
    borderWidth: 2,
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  pickTxt: {
    fontSize: 14,
    color: premium.text,
    fontWeight: '600',
  },
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
});
