import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { EmptyState } from '../../components/premium/EmptyState';
import { PremiumInput } from '../../components/premium/PremiumInput';
import { SkeletonCard, SkeletonHorizontalCards } from '../../components/premium/Skeleton';
import { showToast } from '../../components/premium/Toast';
import { premium } from '../../theme/premiumTheme';
import type { MemberTabParamList } from '../../navigation/memberTabTypes';

type TrainerRow = {
  id: string;
  tenantId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string | null;
  };
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
  trainer: { user: { firstName: string; lastName: string } } | null;
  timeSlot: { id: string; startTime: string; endTime: string } | null;
  package: {
    remainingSessions: number;
    status: string;
    packageType?: { id: string; name: string; sessionType: string };
    packageTypeName?: string;
  } | null;
  spaTherapist?: { id: string; name: string } | null;
  spaService?: { id: string; name: string; durationMinutes: number } | null;
};

type MyPackageRow = {
  id: string;
  remainingSessions: number;
  expiresAt: string;
  status: string;
  packageType: { id: string; name: string; sessionType: string };
};

type ClubEventRow = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  bookedCount: number;
  isJoined: boolean;
};

type CafeProduct = {
  id: string;
  title: string;
  imageUrl: string;
  price: number;
};

type CampaignRow = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  campaignType: 'massage_package' | 'membership' | 'personal_training' | 'general';
  discountKind: 'percentage' | 'fixed';
  discountValue: string;
  originalPrice: string | null;
  discountedPrice: string | null;
  terms: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  maxRedemptions: number | null;
  redemptionCount: number;
  tenant?: { name: string; subdomain: string };
};

type CafeOrderRow = {
  id: string;
  status: 'pending' | 'cancelled' | 'completed';
  totalAmount: number;
  createdAt: string;
  items: Array<{ title: string; quantity: number }>;
};

const SKY_CAFE_PRODUCTS: CafeProduct[] = [
  {
    id: 'fit-bowl',
    title: 'Fit Bowl',
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    price: 310,
  },
  {
    id: 'protein-wrap',
    title: 'Protein Wrap',
    imageUrl:
      'https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=800&q=80',
    price: 240,
  },
  {
    id: 'green-juice',
    title: 'Green Juice',
    imageUrl:
      'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=800&q=80',
    price: 170,
  },
];

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

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

function nextUpcomingReservation(rows: ReservationRow[]): ReservationRow | null {
  const now = Date.now() - 60_000;
  const upcoming = rows
    .filter((r) => new Date(r.startTime).getTime() > now)
    .filter((r) => r.status === 'confirmed' || r.status === 'pending')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return upcoming[0] ?? null;
}

function sumActiveRemainingBySessionType(rows: MyPackageRow[], sessionType: string): number {
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

function localizeEventAction(t: (key: string) => string, message: string): string {
  const m = message.toLowerCase();
  if (m.includes('full')) {
    return t('events.errFull');
  }
  if (m.includes('already registered')) {
    return t('events.errAlready');
  }
  if (m.includes('already started')) {
    return t('events.errStarted');
  }
  if (m.includes('cancel after')) {
    return t('events.errStarted');
  }
  if (m.includes('registration not found')) {
    return t('events.errLeave');
  }
  return t('events.joinFailed');
}

const TAB_BAR_PAD = 72;

export function MemberHomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MemberTabParamList>>();
  const { token, tenant, user } = useMemberAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
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
  const [booking, setBooking] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const bookingSectionY = useRef(0);
  const [hubPlaceholder, setHubPlaceholder] = useState<'massage' | 'events' | 'cafe' | null>(null);
  const [trainersShowAll, setTrainersShowAll] = useState(false);
  const [clubEvents, setClubEvents] = useState<ClubEventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ClubEventRow | null>(null);
  const [eventNotice, setEventNotice] = useState<string | null>(null);
  const [massageSlotsToday, setMassageSlotsToday] = useState<SlotRow[]>([]);
  const [loadingMassageSlots, setLoadingMassageSlots] = useState(false);
  const [selectedCafeProduct, setSelectedCafeProduct] = useState<CafeProduct | null>(null);
  const [cafeOrders, setCafeOrders] = useState<CafeOrderRow[]>([]);
  const [loadingCafeOrders, setLoadingCafeOrders] = useState(false);
  const [submittingCafeOrder, setSubmittingCafeOrder] = useState(false);
  const [cafeName, setCafeName] = useState('');
  const [cafeBlock, setCafeBlock] = useState('');
  const [cafeApartment, setCafeApartment] = useState('');
  const [cafePhone, setCafePhone] = useState('');
  const [cafePaymentMethod, setCafePaymentMethod] = useState<'cash' | 'card'>('cash');

  // --- Campaigns ---
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const loadCampaigns = useCallback(async () => {
    if (!token || !tenant) return;
    setLoadingCampaigns(true);
    try {
      const rows = await apiJson<CampaignRow[]>('/campaigns?limit=6', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setCampaigns(rows);
    } catch {
      // Kampanyalar yüklenemezse sessizce devam et
    } finally {
      setLoadingCampaigns(false);
    }
  }, [token, tenant]);

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

  const loadReservations = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
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

  useEffect(() => {
    if (token && tenant) {
      Promise.all([
        loadPackages().catch(() => {}),
        loadReservations().catch(() => {}),
        loadTrainers().catch(() => {}),
        loadCampaigns().catch(() => {}),
      ]).finally(() => setInitialLoad(false));
    }
  }, [token, tenant, loadPackages, loadReservations, loadTrainers, loadCampaigns]);

  const onRefresh = useCallback(async () => {
    if (!token || !tenant) return;
    setRefreshing(true);
    try {
      await Promise.all([
        loadPackages().catch(() => {}),
        loadReservations().catch(() => {}),
        loadTrainers().catch(() => {}),
        loadCampaigns().catch(() => {}),
      ]);
      showToast(t('home.refreshed'), 'success', 1500);
    } finally {
      setRefreshing(false);
    }
  }, [token, tenant, loadPackages, loadReservations, loadTrainers, loadCampaigns, t]);

  const startConversationWith = useCallback(
    async (otherUserId: string, firstName: string, lastName: string, photoUrl: string | null) => {
      if (!token || !tenant) return;
      try {
        const res = await apiJson<{ conversationId: string }>('/messages/conversations', {
          method: 'POST',
          token,
          tenantSubdomain: tenant.subdomain,
          body: JSON.stringify({ otherUserId }),
        });
        navigation.navigate('Chat', {
          conversationId: res.conversationId,
          otherUser: { id: otherUserId, firstName, lastName, photoUrl },
        });
      } catch {
        showToast('Mesaj başlatılamadı', 'error');
      }
    },
    [token, tenant, navigation],
  );

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

  const nextReservation = useMemo(() => nextUpcomingReservation(reservations), [reservations]);

  const activePackageCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return packages.filter(
      (p) =>
        p.status === 'active' &&
        p.remainingSessions > 0 &&
        typeof p.expiresAt === 'string' &&
        p.expiresAt >= today,
    ).length;
  }, [packages]);

  const lessonCredits = useMemo(
    () => sumActiveRemainingBySessionType(packages, 'personal_training'),
    [packages],
  );
  const massageCredits = useMemo(
    () => sumActiveRemainingBySessionType(packages, 'massage'),
    [packages],
  );

  const joinedEventsCount = useMemo(
    () => clubEvents.filter((e) => e.isJoined).length,
    [clubEvents],
  );

  const loadClubEvents = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setLoadingEvents(true);
    try {
      const rows = await apiJson<ClubEventRow[]>('/events/upcoming?limit=30', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setClubEvents(rows);
    } catch (e) {
      Alert.alert(t('events.section'), e instanceof ApiError ? e.message : t('events.loadFailed'));
    } finally {
      setLoadingEvents(false);
    }
  }, [token, tenant, t]);

  const loadMassageSlotsToday = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setLoadingMassageSlots(true);
    try {
      const trainersRows = await apiJson<TrainerRow[]>('/trainers?sessionType=massage', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const slotResults = await Promise.all(
        trainersRows.slice(0, 3).map(async (tr) => {
          const q = new URLSearchParams({
            trainerId: tr.id,
            from: now.toISOString(),
            to: end.toISOString(),
          });
          const rows = await apiJson<SlotRow[]>(`/availability?${q}`, {
            token,
            tenantSubdomain: tenant.subdomain,
          });
          return rows.filter((row) => row.remainingCapacity > 0);
        }),
      );
      const merged = slotResults
        .flat()
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 8);
      setMassageSlotsToday(merged);
    } catch {
      setMassageSlotsToday([]);
    } finally {
      setLoadingMassageSlots(false);
    }
  }, [token, tenant]);

  const loadCafeOrders = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setLoadingCafeOrders(true);
    try {
      const rows = await apiJson<CafeOrderRow[]>('/cafe/orders/my', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setCafeOrders(rows);
    } catch {
      setCafeOrders([]);
    } finally {
      setLoadingCafeOrders(false);
    }
  }, [token, tenant]);

  useFocusEffect(
    useCallback(() => {
      loadClubEvents().catch(() => {});
      loadMassageSlotsToday().catch(() => {});
      loadCafeOrders().catch(() => {});
    }, [loadClubEvents, loadMassageSlotsToday, loadCafeOrders]),
  );

  useEffect(() => {
    if (!eventNotice) {
      return;
    }
    const timer = setTimeout(() => setEventNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [eventNotice]);

  const toggleEventJoin = useCallback(
    async (row: ClubEventRow) => {
      if (!token || !tenant) {
        return;
      }
      setJoiningEventId(row.id);
      try {
        if (row.isJoined) {
          await apiJson(`/events/${row.id}/join`, {
            method: 'DELETE',
            token,
            tenantSubdomain: tenant.subdomain,
          });
          setEventNotice(`"${row.title}" etkinliğinden ayrıldınız.`);
        } else {
          await apiJson(`/events/${row.id}/join`, {
            method: 'POST',
            token,
            tenantSubdomain: tenant.subdomain,
          });
          setEventNotice(`✅ "${row.title}" etkinliğine katıldınız!`);
        }
        await loadClubEvents();
      } catch (e) {
        setEventNotice(
          e instanceof ApiError ? localizeEventAction(t, e.message) : t('events.joinFailed'),
        );
      } finally {
        setJoiningEventId(null);
      }
    },
    [token, tenant, loadClubEvents, t],
  );

  const scrollToBooking = useCallback(() => {
    setHubPlaceholder(null);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, bookingSectionY.current - 12),
        animated: true,
      });
    });
  }, []);

  const openContactClub = useCallback(() => {
    Alert.alert(t('home.contactClub'), t('home.contactClubAlert'));
  }, [t]);

  const selectTrainerAndScroll = useCallback((trainerId: string) => {
    setSelectedTrainerId(trainerId);
    setHubPlaceholder(null);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, bookingSectionY.current - 12),
        animated: true,
      });
    });
  }, []);

  const openCafeOrder = useCallback(
    (product: CafeProduct) => {
      setSelectedCafeProduct(product);
      setCafeName(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
      setCafeBlock('');
      setCafeApartment('');
      setCafePhone(user?.phone ?? '');
      setCafePaymentMethod('cash');
    },
    [user],
  );

  const submitCafeOrder = useCallback(async () => {
    if (!token || !tenant || !selectedCafeProduct) {
      return;
    }
    if (!cafeName.trim() || !cafeBlock.trim() || !cafeApartment.trim() || !cafePhone.trim()) {
      Alert.alert('SkyCafe', 'Lutfen tum teslimat bilgilerini doldurun.');
      return;
    }
    setSubmittingCafeOrder(true);
    try {
      await apiJson('/cafe/orders', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({
          customerName: cafeName.trim(),
          blockLabel: cafeBlock.trim(),
          apartmentLabel: cafeApartment.trim(),
          phoneNumber: cafePhone.trim(),
          paymentMethod: cafePaymentMethod,
          items: [
            {
              productId: selectedCafeProduct.id,
              title: selectedCafeProduct.title,
              imageUrl: selectedCafeProduct.imageUrl,
              unitPrice: selectedCafeProduct.price,
              quantity: 1,
            },
          ],
        }),
      });
      Alert.alert('SkyCafe', 'Siparisiniz alindi.');
      setSelectedCafeProduct(null);
      await loadCafeOrders();
    } catch (e) {
      Alert.alert('SkyCafe', e instanceof ApiError ? e.message : 'Siparis olusturulamadi.');
    } finally {
      setSubmittingCafeOrder(false);
    }
  }, [
    token,
    tenant,
    selectedCafeProduct,
    cafeName,
    cafeBlock,
    cafeApartment,
    cafePhone,
    cafePaymentMethod,
    loadCafeOrders,
  ]);

  const cancelCafeOrder = useCallback(
    async (id: string) => {
      if (!token || !tenant) {
        return;
      }
      try {
        await apiJson(`/cafe/orders/${id}/cancel`, {
          method: 'POST',
          token,
          tenantSubdomain: tenant.subdomain,
        });
        await loadCafeOrders();
      } catch (e) {
        Alert.alert('SkyCafe', e instanceof ApiError ? e.message : 'Siparis iptal edilemedi.');
      }
    },
    [token, tenant, loadCafeOrders],
  );

  const ripple =
    Platform.OS === 'android' ? { android_ripple: { color: 'rgba(255,255,255,0.2)' } } : {};

  if (!user || !token || !tenant) {
    return null;
  }

  return (
    <GradientBackground>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + TAB_BAR_PAD },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={premium.accentBlue}
            colors={[premium.accentBlue]}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroBrand}>{tenant.name}</Text>
            </View>
            <Pressable
              {...ripple}
              style={({ pressed }) => [styles.notifyBtn, pressed && styles.notifyBtnPressed]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.notifyIcon}>🔔</Text>
            </Pressable>
          </View>
          <View style={styles.heroSessionBlock}>
            <Text style={styles.todayGreet}>{t('home.greeting', { name: user.firstName })}</Text>
            {nextReservation ? (
              <>
                <Text style={styles.todayLabel}>{t('home.nextSessionLabel')}</Text>
                <Text style={styles.todayMeta}>
                  {t('home.nextSessionMeta', {
                    time: fmt(nextReservation.startTime),
                    trainer: nextReservation.trainer
                      ? `${nextReservation.trainer.user.firstName} ${nextReservation.trainer.user.lastName}`
                      : (nextReservation.spaTherapist?.name ?? ''),
                    type:
                      nextReservation.package?.packageType?.name ??
                      nextReservation.spaService?.name ??
                      t('home.unknownSessionType'),
                  })}
                </Text>
                <Pressable
                  {...ripple}
                  style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
                  onPress={() => navigation.navigate('PT')}
                >
                  <Text style={styles.btnPrimaryTxt}>{t('home.ctaBookPt')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.todayMeta}>{t('home.noUpcomingSession')}</Text>
                {activePackageCount === 0 ? (
                  <Text style={styles.warn}>{t('booking.noPackages')}</Text>
                ) : null}
              </>
            )}
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>{t('home.heroLessons')}</Text>
              <Text style={styles.heroStatValue}>{lessonCredits}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>{t('home.heroMassage')}</Text>
              <Text style={styles.heroStatValue}>{massageCredits}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>{t('home.heroEvents')}</Text>
              <Text style={styles.heroStatValue}>{joinedEventsCount}</Text>
            </View>
          </View>
        </View>

        {/* ═══════════ KAMPANYALAR ═══════════ */}
        {campaigns.length > 0 && (
          <View style={styles.campaignSection}>
            <View style={styles.campaignHeader}>
              <Text style={styles.campaignIcon}>🔥</Text>
              <View>
                <Text style={styles.eventsSectionTitle}>Kampanyalar</Text>
                <Text style={styles.campaignSubtitle}>Kulübünüzün özel teklifleri</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventsRailInner}
            >
              {campaigns.map((campaign) => {
                const isPercentage = campaign.discountKind === 'percentage';
                const discountLabel = isPercentage
                  ? `%${campaign.discountValue} İndirim`
                  : `₺${campaign.discountValue} İndirim`;
                const typeEmoji =
                  campaign.campaignType === 'massage_package'
                    ? '💆'
                    : campaign.campaignType === 'membership'
                      ? '🏢'
                      : campaign.campaignType === 'personal_training'
                        ? '🏋️'
                        : '🎁';
                const endsAt = new Date(campaign.endsAt);
                const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000));

                return (
                  <View key={campaign.id} style={styles.campaignCard}>
                    {campaign.imageUrl ? (
                      <Image
                        source={{ uri: campaign.imageUrl }}
                        style={styles.campaignImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.campaignImage, styles.campaignImagePh]}>
                        <Text style={styles.campaignImageEmoji}>{typeEmoji}</Text>
                      </View>
                    )}
                    <View style={styles.campaignCardBody}>
                      <View style={styles.campaignBadge}>
                        <Text style={styles.campaignBadgeTxt}>{discountLabel}</Text>
                      </View>
                      <Text style={styles.campaignTitle} numberOfLines={2}>
                        {campaign.title}
                      </Text>
                      {(campaign.originalPrice || campaign.discountedPrice) && (
                        <View style={styles.campaignPriceRow}>
                          {campaign.originalPrice && (
                            <Text style={styles.campaignOldPrice}>₺{campaign.originalPrice}</Text>
                          )}
                          {campaign.discountedPrice && (
                            <Text style={styles.campaignNewPrice}>₺{campaign.discountedPrice}</Text>
                          )}
                        </View>
                      )}
                      {campaign.maxRedemptions && campaign.maxRedemptions > 0 && (
                        <Text style={styles.campaignQuota}>
                          Kalan: {campaign.maxRedemptions - campaign.redemptionCount} kişi
                        </Text>
                      )}
                      {daysLeft <= 3 && (
                        <Text style={styles.campaignUrgent}>Son {daysLeft} gün!</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 📅 Yaklaşan Randevularım */}
        <Text style={styles.eventsSectionTitle}>📅 Yaklaşan Randevularım</Text>
        {reservations.length === 0 ? (
          <Text style={styles.eventsEmpty}>Yaklaşan randevunuz bulunmuyor.</Text>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 8, marginBottom: 16 }}>
            {reservations
              .filter((r) => r.status === 'confirmed' || r.status === 'pending')
              .slice(0, 3)
              .map((r) => {
                const trainerName = r.trainer
                  ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`
                  : (r.spaTherapist?.name ?? '');
                const serviceName = r.spaService?.name ?? (r.trainer ? 'PT Seansı' : 'Randevu');
                const time = r.timeSlot
                  ? `${fmtTime(r.timeSlot.startTime)} - ${fmtTime(r.timeSlot.endTime)}`
                  : `${fmtTime(r.startTime)} - ${fmtTime(r.endTime)}`;
                return (
                  <View
                    key={r.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: 'rgba(16,185,129,0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(16,185,129,0.2)',
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{r.spaService ? '💆' : '🏋️'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: premium.text, fontSize: 14, fontWeight: '700' }}>
                        {serviceName}
                      </Text>
                      <Text style={{ color: premium.textMuted, fontSize: 12, marginTop: 2 }}>
                        {trainerName} · {time}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: 'rgba(16,185,129,0.2)',
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700' }}>
                        {r.status === 'confirmed' ? '✓ Onaylı' : '⏳ Bekliyor'}
                      </Text>
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            marginBottom: 8,
          }}
        >
          <Text style={styles.eventsSectionTitle}>{t('home.upcomingEventsTitle')}</Text>
          <Pressable
            onPress={() =>
              (navigation as unknown as { navigate: (n: string) => void }).navigate(
                'AllEvents' as never,
              )
            }
          >
            <Text style={{ color: premium.accentBlue, fontSize: 13, fontWeight: '700' }}>
              Tümünü Gör →
            </Text>
          </Pressable>
        </View>
        {eventNotice ? <Text style={styles.eventsNotice}>{eventNotice}</Text> : null}
        {loadingEvents && clubEvents.length === 0 ? (
          <ActivityIndicator color={premium.accentBlue} style={styles.eventsLoader} />
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.eventsRail}
          contentContainerStyle={styles.eventsRailInner}
        >
          {clubEvents.map((ev) => {
            const eventDate = new Date(ev.startsAt);
            const dateStr = eventDate.toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
            });
            const timeStr = eventDate.toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <View key={ev.id} style={homeEventStyles.cardWrapper}>
                <Pressable
                  onPress={() => setSelectedEvent(ev)}
                  style={({ pressed }) => [homeEventStyles.card, pressed && { opacity: 0.85 }]}
                >
                  {ev.imageUrl ? (
                    <Image
                      source={{ uri: ev.imageUrl }}
                      style={homeEventStyles.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={homeEventStyles.imagePlaceholder}>
                      <Text style={{ fontSize: 24 }}>📅</Text>
                    </View>
                  )}
                  <View style={homeEventStyles.body}>
                    <View style={homeEventStyles.header}>
                      <Text style={homeEventStyles.date}>{dateStr}</Text>
                      <Text style={homeEventStyles.time}>{timeStr}</Text>
                    </View>
                    <Text style={homeEventStyles.title} numberOfLines={2}>
                      {ev.title}
                    </Text>
                    {ev.coachName && <Text style={homeEventStyles.coach}>🏋️ {ev.coachName}</Text>}
                    <Text style={homeEventStyles.capacity}>
                      👥 {ev.bookedCount}/{ev.capacity} katılım
                    </Text>
                  </View>
                </Pressable>
                <Pressable style={homeEventStyles.ctaBtn} onPress={() => setSelectedEvent(ev)}>
                  <Text style={homeEventStyles.ctaBtnTxt}>📅 Detay & Katıl</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
        {!loadingEvents && clubEvents.length === 0 ? (
          <Text style={styles.eventsEmpty}>{t('home.noUpcomingEvents')}</Text>
        ) : null}

        <Text style={styles.trainersSectionTitle}>{t('home.ourTrainersTitle')}</Text>
        {loadingTrainers && trainers.length === 0 ? (
          <ActivityIndicator color={premium.accentBlue} style={styles.eventsLoader} />
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.trainersRail}
          contentContainerStyle={styles.trainersRailInner}
        >
          {trainers.map((tr) => {
            const fullName = `${tr.user.firstName} ${tr.user.lastName}`.trim();
            const initials = `${tr.user.firstName?.[0] ?? ''}${tr.user.lastName?.[0] ?? ''}`
              .trim()
              .toUpperCase();
            return (
              <View key={`showcase-${tr.id}`} style={styles.trainerCardWrap}>
                <Pressable
                  style={({ pressed }) => [
                    styles.trainerProfileCard,
                    pressed && styles.trainerRowPressed,
                  ]}
                  onPress={() => selectTrainerAndScroll(tr.id)}
                >
                  <View style={styles.trainerAvatarRing}>
                    {tr.user.photoUrl ? (
                      <Image source={{ uri: tr.user.photoUrl }} style={styles.trainerAvatarImage} />
                    ) : (
                      <Text style={styles.trainerAvatarFallback}>{initials || 'TR'}</Text>
                    )}
                  </View>
                  <Text style={styles.trainerProfileName} numberOfLines={2}>
                    {fullName}
                  </Text>
                </Pressable>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.trainerPlanBtn}
                  onPress={() => navigation.navigate('PT')}
                >
                  <Text style={styles.trainerPlanBtnTxt}>Özel Ders Planla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.trainerMsgBtn}
                  onPress={() =>
                    startConversationWith(
                      tr.user.id,
                      tr.user.firstName,
                      tr.user.lastName,
                      tr.user.photoUrl ?? null,
                    )
                  }
                >
                  <Text style={styles.trainerMsgBtnTxt}>💬 Mesaj</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
        {!loadingTrainers && trainers.length === 0 ? (
          <Text style={styles.eventsEmpty}>{t('home.trainersEmpty')}</Text>
        ) : null}

        <Text style={styles.eventsSectionTitle}>SkyCafe - Gunun Urunleri</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.eventsRail}
          contentContainerStyle={styles.eventsRailInner}
        >
          {SKY_CAFE_PRODUCTS.map((product) => (
            <View key={product.id} style={styles.eventCard}>
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.eventImage}
                resizeMode="cover"
              />
              <View style={styles.eventCardBody}>
                <Text style={styles.eventTitle}>{product.title}</Text>
                <Text style={styles.eventCapacity}>{product.price} TL</Text>
                <Pressable
                  style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
                  onPress={() => openCafeOrder(product)}
                >
                  <Text style={styles.btnOutlineTxt}>Siparis Ver</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.cardTitle}>SkyCafe Siparislerim</Text>
          {loadingCafeOrders ? <ActivityIndicator color={premium.accentBlue} /> : null}
          {!loadingCafeOrders && cafeOrders.length === 0 ? (
            <Text style={styles.muted}>Henuz siparisiniz yok.</Text>
          ) : null}
          {cafeOrders.slice(0, 3).map((row) => (
            <View key={row.id} style={styles.pick}>
              <Text style={styles.pickTxt}>
                {new Date(row.createdAt).toLocaleString('tr-TR')} · {row.totalAmount} TL ·{' '}
                {row.status}
              </Text>
              <Text style={styles.muted}>{row.items.map((item) => item.title).join(', ')}</Text>
              {row.status === 'pending' ? (
                <Pressable
                  style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
                  onPress={() => cancelCafeOrder(row.id)}
                >
                  <Text style={styles.btnGhostTxt}>Siparisi Iptal Et</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </GlassCard>
        <Modal
          visible={!!selectedEvent}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedEvent(null)}
        >
          {selectedEvent ? (
            <Pressable style={styles.modalBackdrop} onPress={() => setSelectedEvent(null)}>
              <Pressable style={styles.modalCard} onPress={() => {}}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalCloseBtn,
                      pressed && styles.modalCloseBtnPressed,
                    ]}
                    onPress={() => setSelectedEvent(null)}
                  >
                    <Text style={styles.modalCloseTxt}>×</Text>
                  </Pressable>
                </View>
                {selectedEvent.imageUrl ? (
                  <Image
                    source={{ uri: selectedEvent.imageUrl }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.modalImage, styles.eventImagePh]}>
                    <Text style={styles.eventImagePhTxt}>{t('events.noImage')}</Text>
                  </View>
                )}
                <Text style={styles.modalMeta}>
                  {t('events.locationLabel')}: {selectedEvent.location || '-'}
                </Text>
                <Text style={styles.modalMeta}>
                  {t('events.dateLabel')}: {fmtDate(selectedEvent.startsAt)}
                </Text>
                <Text style={styles.modalMeta}>
                  {t('events.startLabel')}: {fmtTime(selectedEvent.startsAt)}
                </Text>
                <Text style={styles.modalMeta}>
                  {t('events.endLabel')}:{' '}
                  {selectedEvent.endsAt ? fmtTime(selectedEvent.endsAt) : '-'}
                </Text>
                <Text style={styles.modalMeta}>
                  {t('events.coachLabel')}: {selectedEvent.coachName || '-'}
                </Text>
                <Text style={styles.modalMeta}>
                  {t('events.capacity', {
                    booked: selectedEvent.bookedCount,
                    capacity: selectedEvent.capacity,
                  })}
                </Text>
                {selectedEvent.description ? (
                  <Text style={styles.modalDescription}>{selectedEvent.description}</Text>
                ) : null}
                <Pressable
                  {...ripple}
                  style={({ pressed }) => [
                    selectedEvent.isJoined ? styles.btnGhost : styles.btnPrimary,
                    pressed &&
                      (selectedEvent.isJoined ? styles.btnGhostPressed : styles.btnPrimaryPressed),
                    (joiningEventId === selectedEvent.id ||
                      (!selectedEvent.isJoined &&
                        selectedEvent.bookedCount >= selectedEvent.capacity)) &&
                      styles.disabled,
                  ]}
                  disabled={
                    joiningEventId === selectedEvent.id ||
                    (!selectedEvent.isJoined && selectedEvent.bookedCount >= selectedEvent.capacity)
                  }
                  onPress={() => {
                    toggleEventJoin(selectedEvent)
                      .then(() => setSelectedEvent(null))
                      .catch(() => {});
                  }}
                >
                  {joiningEventId === selectedEvent.id ? (
                    <ActivityIndicator
                      color={selectedEvent.isJoined ? premium.textMuted : '#fff'}
                    />
                  ) : (
                    <Text
                      style={selectedEvent.isJoined ? styles.btnGhostTxt : styles.btnPrimaryTxt}
                    >
                      {selectedEvent.isJoined
                        ? t('events.leave')
                        : selectedEvent.bookedCount >= selectedEvent.capacity
                          ? t('events.full')
                          : t('events.join')}
                    </Text>
                  )}
                </Pressable>
              </Pressable>
            </Pressable>
          ) : null}
        </Modal>

        <Modal
          visible={!!selectedCafeProduct}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedCafeProduct(null)}
        >
          {selectedCafeProduct ? (
            <Pressable style={styles.modalBackdrop} onPress={() => setSelectedCafeProduct(null)}>
              <Pressable style={styles.modalCard} onPress={() => {}}>
                <Text style={styles.modalTitle}>SkyCafe Siparis</Text>
                <Text style={styles.modalMeta}>
                  {selectedCafeProduct.title} - {selectedCafeProduct.price} TL
                </Text>
                <PremiumInput label="Isim Soyisim" value={cafeName} onChangeText={setCafeName} />
                <PremiumInput label="Blok" value={cafeBlock} onChangeText={setCafeBlock} />
                <PremiumInput label="Daire" value={cafeApartment} onChangeText={setCafeApartment} />
                <PremiumInput label="Telefon" value={cafePhone} onChangeText={setCafePhone} />
                <View style={styles.paymentRow}>
                  <Pressable
                    style={[styles.pick, cafePaymentMethod === 'cash' && styles.pickOn]}
                    onPress={() => setCafePaymentMethod('cash')}
                  >
                    <Text style={styles.pickTxt}>Nakit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.pick, cafePaymentMethod === 'card' && styles.pickOn]}
                    onPress={() => setCafePaymentMethod('card')}
                  >
                    <Text style={styles.pickTxt}>Kart</Text>
                  </Pressable>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
                  onPress={() => {
                    submitCafeOrder().catch(() => {});
                  }}
                  disabled={submittingCafeOrder}
                >
                  {submittingCafeOrder ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimaryTxt}>Siparisi Onayla</Text>
                  )}
                </Pressable>
              </Pressable>
            </Pressable>
          ) : null}
        </Modal>

        <Text style={styles.servicesHeading}>{t('home.servicesTitle')}</Text>
        <View style={styles.grid}>
          <Pressable
            style={({ pressed }) => [styles.svcCard, pressed && styles.svcCardPressed]}
            onPress={() => {
              setHubPlaceholder(null);
              navigation.navigate('Discover');
            }}
          >
            <Text style={styles.svcTitle}>{t('home.servicePtTitle')}</Text>
            <Text style={styles.svcSub}>{t('home.servicePtSubtitle')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.svcCard, pressed && styles.svcCardPressed]}
            onPress={() => {
              setHubPlaceholder(null);
              navigation.navigate('Spa');
            }}
          >
            <Text style={styles.svcTitle}>{t('home.serviceMassageTitle')}</Text>
            <Text style={styles.svcSub}>{t('home.serviceMassageSubtitle')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.svcCard, pressed && styles.svcCardPressed]}
            onPress={() => setHubPlaceholder('events')}
          >
            <Text style={styles.svcTitle}>{t('home.serviceEventsTitle')}</Text>
            <Text style={styles.svcSub}>{t('home.serviceEventsSubtitle')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.svcCard, pressed && styles.svcCardPressed]}
            onPress={() => setHubPlaceholder('cafe')}
          >
            <Text style={styles.svcTitle}>{t('home.serviceCafeTitle')}</Text>
            <Text style={styles.svcSub}>{t('home.serviceCafeSubtitle')}</Text>
          </Pressable>
        </View>

        {hubPlaceholder ? (
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.cardTitle}>
              {t('home.placeholderIntro', {
                service:
                  hubPlaceholder === 'massage'
                    ? t('home.serviceMassageTitle')
                    : hubPlaceholder === 'events'
                      ? t('home.serviceEventsTitle')
                      : t('home.serviceCafeTitle'),
              })}
            </Text>
            <Text style={styles.muted}>{t('home.placeholderBody')}</Text>
            <Pressable
              {...ripple}
              style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
              onPress={openContactClub}
            >
              <Text style={styles.btnOutlineTxt}>{t('home.contactClub')}</Text>
            </Pressable>
          </GlassCard>
        ) : null}
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
  heroTextCol: { flex: 1, minWidth: 0 },
  heroBrand: {
    fontSize: 22,
    fontWeight: '800',
    color: premium.text,
    letterSpacing: -0.3,
  },
  notifyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  notifyIcon: {
    fontSize: 17,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: premium.glassBorder,
  },
  heroSessionBlock: {
    marginTop: 14,
    paddingTop: 0,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: premium.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: premium.text,
    textAlign: 'center',
  },
  eventsSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginTop: 12,
    marginBottom: 10,
  },
  eventsLoader: {
    marginBottom: 12,
  },
  eventsNotice: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.accentGreen,
    marginBottom: 8,
  },
  eventsRail: {
    marginBottom: 8,
    marginHorizontal: -4,
  },
  eventsRailInner: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    flexDirection: 'row',
  },
  eventCard: {
    width: 130,
    marginRight: 8,
    borderRadius: premium.radiusMd,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.28)',
    overflow: 'hidden',
  },
  eventTapArea: {
    flex: 1,
  },
  eventTapAreaPressed: {
    opacity: 0.85,
  },
  eventImage: {
    width: '100%',
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  eventImagePh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventImagePhTxt: {
    color: premium.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  eventCardBody: {
    padding: 8,
    gap: 4,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: premium.text,
    minHeight: 14,
  },
  eventMetaLine: {
    fontSize: 10,
    color: premium.textMuted,
  },
  eventCapacity: {
    fontSize: 10,
    fontWeight: '700',
    color: premium.accentGreen,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,10,18,0.7)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    borderRadius: premium.radiusLg,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: '#0b1220',
    padding: 16,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: premium.text,
    flex: 1,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalCloseBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  modalCloseTxt: {
    color: premium.text,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
  },
  modalImage: {
    width: '100%',
    height: 150,
    borderRadius: premium.radiusMd,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalMeta: {
    fontSize: 13,
    color: premium.text,
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 13,
    color: premium.textMuted,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 12,
  },
  eventsEmpty: {
    fontSize: 13,
    color: premium.textMuted,
    marginBottom: 12,
  },
  trainersSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginTop: 6,
    marginBottom: 10,
  },
  trainersRail: {
    marginBottom: 10,
    marginHorizontal: -4,
  },
  trainersRailInner: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    flexDirection: 'row',
    gap: 8,
  },
  trainerCardWrap: {
    width: 112,
  },
  trainerProfileCard: {
    width: 112,
    minHeight: 140,
    borderRadius: premium.radiusMd,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 10,
    alignItems: 'center',
  },
  trainerAvatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: premium.glassBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
    marginBottom: 10,
  },
  trainerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  trainerAvatarFallback: {
    color: premium.text,
    fontSize: 22,
    fontWeight: '800',
  },
  trainerProfileName: {
    fontSize: 13,
    fontWeight: '700',
    color: premium.text,
    textAlign: 'center',
  },
  trainerPlanBtn: {
    marginTop: 8,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(7, 61, 106, 0.35)',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerPlanBtnTxt: {
    color: premium.text,
    fontSize: 12,
    fontWeight: '700',
  },
  trainerMsgBtn: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    backgroundColor: 'rgba(56,189,248,0.08)',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerMsgBtnTxt: {
    color: premium.accentBlue,
    fontSize: 11,
    fontWeight: '700',
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
  todayGreet: {
    fontSize: 17,
    fontWeight: '700',
    color: premium.text,
    marginBottom: 8,
  },
  todayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  todayMeta: {
    fontSize: 15,
    lineHeight: 22,
    color: premium.text,
    marginBottom: 10,
  },
  servicesHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 10,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  svcCard: {
    width: '48%',
    minHeight: 96,
    padding: 14,
    borderRadius: premium.radiusMd,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  svcCardPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  svcTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 6,
  },
  svcSub: {
    fontSize: 12,
    lineHeight: 16,
    color: premium.textMuted,
  },
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 8,
  },
  trainerRowPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  trainerName: {
    fontSize: 15,
    fontWeight: '700',
    color: premium.text,
    flex: 1,
    marginRight: 8,
  },
  trainerCta: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.accentBlue,
  },
  spinnerPad: {
    marginVertical: 12,
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
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
  // ─── Campaigns ─────────────────────────────────────────────────────────────
  campaignSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  campaignIcon: {
    fontSize: 20,
  },
  campaignSubtitle: {
    fontSize: 11,
    color: premium.textMuted,
    fontWeight: '600',
  },
  campaignCard: {
    width: 130,
    marginRight: 8,
    borderRadius: premium.radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    backgroundColor: 'rgba(251,191,36,0.06)',
    overflow: 'hidden',
  },
  campaignImage: {
    width: '100%',
    height: 60,
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  campaignImagePh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignImageEmoji: {
    fontSize: 24,
  },
  campaignCardBody: {
    padding: 8,
    gap: 4,
  },
  campaignBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  campaignBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fbbf24',
  },
  campaignTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: premium.text,
    lineHeight: 15,
  },
  campaignUrgent: {
    fontSize: 10,
    fontWeight: '700',
    color: premium.danger,
  },
  campaignPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  campaignOldPrice: {
    fontSize: 11,
    color: premium.textMuted,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  campaignNewPrice: {
    fontSize: 13,
    color: premium.accentGreen,
    fontWeight: '800',
  },
  campaignQuota: {
    fontSize: 10,
    color: premium.textMuted,
    fontWeight: '600',
  },
});

const homeEventStyles = StyleSheet.create({
  cardWrapper: { width: 180, gap: 8 },
  card: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    overflow: 'hidden',
  },
  image: { width: '100%', height: 80, backgroundColor: 'rgba(0,0,0,0.3)' },
  imagePlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 10, gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: premium.accentBlue, fontSize: 11, fontWeight: '800' },
  time: { color: premium.textMuted, fontSize: 10, fontWeight: '600' },
  title: { color: premium.text, fontSize: 13, fontWeight: '800', lineHeight: 17 },
  coach: { color: premium.textMuted, fontSize: 10 },
  capacity: { color: premium.textMuted, fontSize: 10, marginTop: 2 },
  ctaBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    backgroundColor: 'rgba(56,189,248,0.06)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  ctaBtnTxt: { color: premium.accentBlue, fontSize: 12, fontWeight: '800' },
});
