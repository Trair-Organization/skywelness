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
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../api/client';
import { clearMemberSession, loadMemberSession, saveMemberSession } from '../auth/sessionStorage';
import { persistLanguage } from '../i18n';

type TenantInfo = { id: string; name: string; subdomain: string };
type AuthRes = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: {
    id: string;
    tenantId?: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
};
type MeUser = AuthRes['user'];

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

const palette = {
  pageBg: '#f1f5f9',
  surface: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  hero: '#0f766e',
  heroSoft: 'rgba(255,255,255,0.88)',
  primary: '#0d9488',
  primaryDark: '#0f766e',
  successBg: '#ecfdf5',
  successText: '#047857',
  warnBg: '#fffbeb',
  warnText: '#b45309',
  danger: '#dc2626',
} as const;

const logoHeaderLight = require('../../assets/branding/wellness-club-logo-header.png');
const logoHeaderDark = require('../../assets/branding/wellness-club-logo-header-dark.png');

export function MemberHome() {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [subdomain, setSubdomain] = useState('');
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MeUser | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadMemberSession();
        if (!stored?.refreshToken || !stored.tenantSubdomain) {
          return;
        }
        setSubdomain(stored.tenantSubdomain);
        try {
          const res = await apiJson<AuthRes>('/auth/refresh', {
            method: 'POST',
            auth: false,
            body: JSON.stringify({ refreshToken: stored.refreshToken }),
          });
          const ten = await apiJson<TenantInfo>(
            `/tenants/by-subdomain/${encodeURIComponent(stored.tenantSubdomain)}`,
            { auth: false },
          );
          if (cancelled) {
            return;
          }
          setTenant(ten);
          setToken(res.accessToken);
          setUser(res.user);
          setTrainers([]);
          setSlots([]);
          setSelectedTrainerId(null);
          setSelectedSlotId(null);
          setReservations([]);
          setPackages([]);
          setSelectedPackageId(null);
          await saveMemberSession({
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            tenantSubdomain: ten.subdomain,
            tenant: ten,
            user: res.user,
          });
          try {
            const rows = await apiJson<MyPackageRow[]>('/my-packages', {
              token: res.accessToken,
              tenantSubdomain: ten.subdomain,
            });
            if (!cancelled) {
              setPackages(rows);
              setSelectedPackageId(pickDefaultPackageId(rows));
            }
          } catch {
            if (!cancelled) {
              setPackages([]);
            }
          }
        } catch {
          await clearMemberSession();
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadTenant = useCallback(async () => {
    const s = subdomain.trim().toLowerCase();
    if (!s) {
      Alert.alert(t('tenant.section'), t('tenant.enterSubdomain'));
      return;
    }
    setLoadingTenant(true);
    setTenant(null);
    try {
      const row = await apiJson<TenantInfo>(`/tenants/by-subdomain/${encodeURIComponent(s)}`, {
        auth: false,
      });
      setTenant(row);
    } catch (e) {
      Alert.alert(t('tenant.section'), e instanceof ApiError ? e.message : t('tenant.loadFailed'));
    } finally {
      setLoadingTenant(false);
    }
  }, [subdomain, t]);

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

  const completeSignIn = useCallback(async (res: AuthRes, ten: TenantInfo) => {
    setToken(res.accessToken);
    setUser(res.user);
    setTrainers([]);
    setSlots([]);
    setSelectedTrainerId(null);
    setSelectedSlotId(null);
    setReservations([]);
    setPackages([]);
    setSelectedPackageId(null);
    await saveMemberSession({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      tenantSubdomain: ten.subdomain,
      tenant: ten,
      user: res.user,
    });
    try {
      const rows = await apiJson<MyPackageRow[]>('/my-packages', {
        token: res.accessToken,
        tenantSubdomain: ten.subdomain,
      });
      setPackages(rows);
      setSelectedPackageId(pickDefaultPackageId(rows));
    } catch {
      setPackages([]);
    }
  }, []);

  const login = useCallback(async () => {
    if (!tenant) {
      Alert.alert(t('login.section'), t('login.needTenant'));
      return;
    }
    setLoadingAuth(true);
    try {
      const res = await apiJson<AuthRes>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          email: email.trim(),
          password,
          tenantSubdomain: tenant.subdomain,
        }),
      });
      await completeSignIn(res, tenant);
    } catch (e) {
      Alert.alert(t('login.section'), e instanceof ApiError ? e.message : t('login.failed'));
    } finally {
      setLoadingAuth(false);
    }
  }, [tenant, email, password, t, completeSignIn]);

  const register = useCallback(async () => {
    if (!tenant) {
      Alert.alert(t('register.section'), t('login.needTenant'));
      return;
    }
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      Alert.alert(t('register.section'), t('register.nameRequired'));
      return;
    }
    setLoadingAuth(true);
    try {
      const res = await apiJson<AuthRes>('/auth/register', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: fn,
          lastName: ln,
          tenantSubdomain: tenant.subdomain,
        }),
      });
      await completeSignIn(res, tenant);
    } catch (e) {
      Alert.alert(t('register.section'), e instanceof ApiError ? e.message : t('register.failed'));
    } finally {
      setLoadingAuth(false);
    }
  }, [tenant, email, password, firstName, lastName, t, completeSignIn]);

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

  const logout = useCallback(async () => {
    if (token && tenant) {
      try {
        await apiJson('/auth/logout', {
          method: 'POST',
          token,
          tenantSubdomain: tenant.subdomain,
        });
      } catch {
        // ignore
      }
    }
    await clearMemberSession();
    setToken(null);
    setUser(null);
    setTrainers([]);
    setSlots([]);
    setReservations([]);
    setPackages([]);
    setSelectedTrainerId(null);
    setSelectedSlotId(null);
    setSelectedPackageId(null);
  }, [token, tenant]);

  const ripple =
    Platform.OS === 'android' ? { android_ripple: { color: 'rgba(255,255,255,0.2)' } } : {};

  if (!authReady) {
    return (
      <View style={[styles.page, styles.bootWrap]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View style={styles.heroLead}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={t('appTitle')}
              source={colorScheme === 'dark' ? logoHeaderDark : logoHeaderLight}
              style={styles.heroLogo}
            />
            <View style={styles.heroTitles}>
              <Text style={styles.heroBrand}>{t('appTitle')}</Text>
              <Text style={styles.heroTagline}>{t('home.tagline')}</Text>
            </View>
          </View>
          <Text style={styles.langLabelHero}>{t('lang.label')}</Text>
        </View>
        <View style={styles.langSegment}>
          <Pressable
            accessibilityRole="button"
            style={[styles.langSegBtn, i18n.language === 'tr' && styles.langSegBtnOn]}
            onPress={() => {
              persistLanguage('tr').catch(() => {});
            }}
          >
            <Text style={[styles.langSegText, i18n.language === 'tr' && styles.langSegTextOn]}>
              {t('lang.tr')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.langSegBtn, i18n.language === 'en' && styles.langSegBtnOn]}
            onPress={() => {
              persistLanguage('en').catch(() => {});
            }}
          >
            <Text style={[styles.langSegText, i18n.language === 'en' && styles.langSegTextOn]}>
              {t('lang.en')}
            </Text>
          </Pressable>
        </View>
      </View>

      {!user ? (
        <View style={styles.surfaceCard}>
          <Text style={styles.cardTitle}>{t('tenant.workspaceTitle')}</Text>
          <Text style={styles.fieldLabel}>{t('tenant.subdomainLabel')}</Text>
          <TextInput
            style={styles.input}
            value={subdomain}
            onChangeText={setSubdomain}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('tenant.placeholder')}
            placeholderTextColor={palette.muted}
          />
          <Pressable
            {...ripple}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.btnPrimaryPressed,
              loadingTenant && styles.btnDisabled,
            ]}
            onPress={() => {
              loadTenant().catch(() => {});
            }}
            disabled={loadingTenant}
          >
            {loadingTenant ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('tenant.load')}</Text>
            )}
          </Pressable>
          {tenant ? (
            <View style={styles.tenantChip}>
              <Text style={styles.tenantChipMark}>✓</Text>
              <View style={styles.tenantChipBody}>
                <Text style={styles.tenantChipLabel}>{t('tenant.connected')}</Text>
                <Text style={styles.tenantChipName}>
                  {tenant.name} · {tenant.subdomain}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.authSegment}>
            <Pressable
              accessibilityRole="button"
              style={[styles.authSegBtn, authMode === 'login' && styles.authSegBtnOn]}
              onPress={() => setAuthMode('login')}
            >
              <Text style={[styles.authSegText, authMode === 'login' && styles.authSegTextOn]}>
                {t('auth.tabLogin')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.authSegBtn, authMode === 'register' && styles.authSegBtnOn]}
              onPress={() => setAuthMode('register')}
            >
              <Text style={[styles.authSegText, authMode === 'register' && styles.authSegTextOn]}>
                {t('auth.tabRegister')}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.cardTitle}>
            {authMode === 'login' ? t('login.signInTitle') : t('register.title')}
          </Text>

          {authMode === 'register' ? (
            <>
              <Text style={styles.fieldLabel}>{t('register.firstName')}</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                placeholder={t('register.firstPh')}
                placeholderTextColor={palette.muted}
              />
              <Text style={styles.fieldLabel}>{t('register.lastName')}</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                placeholder={t('register.lastPh')}
                placeholderTextColor={palette.muted}
              />
            </>
          ) : null}

          <Text style={styles.fieldLabel}>{t('login.emailLabel')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t('login.emailPh')}
            placeholderTextColor={palette.muted}
          />
          <Text style={styles.fieldLabel}>{t('login.passwordLabel')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t('login.passwordPh')}
            placeholderTextColor={palette.muted}
          />
          {authMode === 'register' ? (
            <Text style={styles.passwordHint}>{t('register.passwordRules')}</Text>
          ) : null}
          {authMode === 'login' ? (
            <Pressable
              accessibilityRole="button"
              style={styles.forgotLinkWrap}
              onPress={() => {
                Alert.alert(t('forgot.title'), t('forgot.body'));
              }}
            >
              <Text style={styles.forgotLink}>{t('forgot.link')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            {...ripple}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.btnPrimaryPressed,
              (!tenant || loadingAuth) && styles.btnDisabled,
            ]}
            onPress={() => {
              if (authMode === 'login') {
                login().catch(() => {});
              } else {
                register().catch(() => {});
              }
            }}
            disabled={!tenant || loadingAuth}
          >
            {loadingAuth ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>
                {authMode === 'login' ? t('login.submit') : t('register.submit')}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {user && token && tenant ? (
        <View style={styles.sessionCard}>
          <Text style={styles.cardTitle}>{t('session.title')}</Text>
          <Text style={styles.cardLine}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.cardLine}>{user.email}</Text>
          <Text style={styles.cardLine}>{t('session.role', { role: user.role })}</Text>
          <Pressable
            style={styles.btnSecondary}
            onPress={() => {
              logout().catch(() => {});
            }}
          >
            <Text style={styles.btnSecondaryText}>{t('session.logout')}</Text>
          </Pressable>

          <Text style={styles.sectionHeading}>{t('booking.section')}</Text>
          <Text style={styles.muted}>{t('booking.packageHint')}</Text>

          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
            onPress={() => {
              loadPackages().catch(() => {});
            }}
            disabled={loadingPackages}
          >
            {loadingPackages ? (
              <ActivityIndicator color={palette.primary} />
            ) : (
              <Text style={styles.btnOutlineText}>{t('booking.loadPackages')}</Text>
            )}
          </Pressable>

          {packages.length === 0 ? (
            <Text style={styles.warnBanner}>{t('booking.noPackages')}</Text>
          ) : (
            <>
              <Text style={styles.subLabel}>{t('booking.pickPackage')}</Text>
              {packages.map((p) => {
                const selected = p.id === selectedPackageId;
                return (
                  <Pressable
                    key={p.id}
                    style={[styles.pick, selected && styles.pickSelected]}
                    onPress={() => setSelectedPackageId(p.id)}
                  >
                    <Text style={styles.pickText}>
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
              loadingTrainers && styles.btnDisabled,
            ]}
            onPress={() => {
              loadTrainers().catch(() => {});
            }}
            disabled={loadingTrainers}
          >
            {loadingTrainers ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('booking.listTrainers')}</Text>
            )}
          </Pressable>

          {trainers.map((tr) => {
            const selected = tr.id === selectedTrainerId;
            return (
              <Pressable
                key={tr.id}
                style={[styles.pick, selected && styles.pickSelected]}
                onPress={() => setSelectedTrainerId(tr.id)}
              >
                <Text style={styles.pickText}>
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
              (!selectedTrainerId || loadingSlots) && styles.btnDisabled,
            ]}
            onPress={() => {
              loadAvailability().catch(() => {});
            }}
            disabled={!selectedTrainerId || loadingSlots}
          >
            {loadingSlots ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('booking.loadAvailability')}</Text>
            )}
          </Pressable>

          <Text style={styles.subLabel}>{t('booking.slotsTitle')}</Text>
          {slots.length === 0 ? <Text style={styles.muted}>{t('booking.emptySlots')}</Text> : null}
          {slots.map((s) => {
            const selected = s.id === selectedSlotId;
            return (
              <Pressable
                key={s.id}
                style={[styles.pick, selected && styles.pickSelected]}
                onPress={() => setSelectedSlotId(s.id)}
              >
                <Text style={styles.pickText}>
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
              (!selectedSlotId || booking) && styles.btnDisabled,
            ]}
            onPress={() => {
              bookSlot().catch(() => {});
            }}
            disabled={!selectedSlotId || booking}
          >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('booking.book')}</Text>
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
              <ActivityIndicator color={palette.primary} />
            ) : (
              <Text style={styles.btnOutlineText}>{t('booking.refreshRes')}</Text>
            )}
          </Pressable>

          {reservations.map((r) => {
            const canCancel =
              (r.status === 'confirmed' || r.status === 'pending') &&
              new Date(r.startTime) > new Date();
            return (
              <View key={r.id} style={styles.resRow}>
                <Text style={styles.resText}>
                  {fmt(r.startTime)} · {r.trainer.user.firstName} {r.trainer.user.lastName} ·{' '}
                  {r.status}
                </Text>
                {canCancel ? (
                  <Pressable
                    style={styles.btnSmall}
                    disabled={cancellingId === r.id}
                    onPress={() => {
                      cancelReservation(r.id).catch(() => {});
                    }}
                  >
                    {cancellingId === r.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnSmallText}>{t('booking.cancel')}</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.pageBg,
  },
  bootWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    flexGrow: 1,
  },
  hero: {
    backgroundColor: palette.hero,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroLead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 12,
  },
  heroLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  heroTitles: {
    flex: 1,
    minWidth: 0,
  },
  heroBrand: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroTagline: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: palette.heroSoft,
  },
  langLabelHero: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.heroSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  langSegment: {
    flexDirection: 'row',
    marginTop: 18,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  langSegBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  langSegBtnOn: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  langSegText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.heroSoft,
  },
  langSegTextOn: {
    color: palette.hero,
  },
  surfaceCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  sessionCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 4,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.muted,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    marginBottom: 14,
    fontSize: 16,
    color: palette.text,
    backgroundColor: '#f8fafc',
  },
  btnPrimary: {
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 52,
  },
  btnPrimaryPressed: {
    backgroundColor: palette.primaryDark,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  tenantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.successBg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 12,
  },
  tenantChipMark: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.successText,
  },
  tenantChipBody: {
    flex: 1,
    minWidth: 0,
  },
  tenantChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.successText,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  tenantChipName: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 22,
  },
  authSegment: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  authSegBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  authSegBtnOn: {
    backgroundColor: palette.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  authSegText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.muted,
  },
  authSegTextOn: {
    color: palette.primary,
  },
  passwordHint: {
    fontSize: 12,
    lineHeight: 17,
    color: palette.muted,
    marginBottom: 12,
    marginTop: -6,
  },
  forgotLinkWrap: {
    alignSelf: 'flex-start',
    marginBottom: 14,
    paddingVertical: 4,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primary,
    textDecorationLine: 'underline',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
    color: palette.text,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.muted,
    marginBottom: 12,
  },
  warnBanner: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.warnText,
    backgroundColor: palette.warnBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardLine: {
    marginBottom: 6,
    fontSize: 15,
    color: palette.text,
  },
  btnSecondary: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#f8fafc',
  },
  btnSecondaryText: {
    fontWeight: '600',
    fontSize: 15,
    color: palette.muted,
  },
  pick: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  pickSelected: {
    borderColor: palette.primary,
    borderWidth: 2,
    backgroundColor: '#f0fdfa',
  },
  pickText: {
    fontSize: 14,
    color: palette.text,
    fontWeight: '500',
  },
  btnOutline: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.primary,
    marginBottom: 12,
    backgroundColor: '#f0fdfa',
  },
  btnOutlinePressed: {
    backgroundColor: '#ccfbf1',
  },
  btnOutlineText: {
    color: palette.primaryDark,
    fontWeight: '700',
    fontSize: 15,
  },
  resRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  resText: {
    flex: 1,
    fontSize: 13,
    marginRight: 8,
    color: palette.text,
  },
  btnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.danger,
    borderRadius: 10,
  },
  btnSmallText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});
