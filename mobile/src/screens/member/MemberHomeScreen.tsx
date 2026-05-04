import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { premium } from '../../theme/premiumTheme';
import type { MemberTabParamList } from '../../navigation/memberTabTypes';

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
  package: {
    remainingSessions: number;
    status: string;
    packageType?: { id: string; name: string; sessionType: string };
  };
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

const logoDark = require('../../../assets/branding/wellness-club-logo-header-dark.png');

const TAB_BAR_PAD = 72;

export function MemberHomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MemberTabParamList>>();
  const { token, tenant, user } = useMemberAuth();

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
      loadPackages().catch(() => {});
      loadReservations().catch(() => {});
      loadTrainers().catch(() => {});
    }
  }, [token, tenant, loadPackages, loadReservations, loadTrainers]);

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

  useFocusEffect(
    useCallback(() => {
      loadClubEvents().catch(() => {});
    }, [loadClubEvents]),
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
          setEventNotice(t('events.leftOk'));
        } else {
          await apiJson(`/events/${row.id}/join`, {
            method: 'POST',
            token,
            tenantSubdomain: tenant.subdomain,
          });
          setEventNotice(t('events.joinedOk'));
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
      >
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={tenant.name}
              source={logoDark}
              style={styles.heroLogo}
            />
            <View style={styles.heroTextCol}>
              <Text style={styles.heroBrand}>{tenant.name}</Text>
              <Text style={styles.heroTag}>{t('home.hubTagline')}</Text>
            </View>
            <Pressable
              {...ripple}
              style={({ pressed }) => [styles.notifyBtn, pressed && styles.notifyBtnPressed]}
              onPress={() => navigation.navigate('SpecialLessons')}
            >
              <Text style={styles.notifyIcon}>🔔</Text>
            </Pressable>
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
          </View>
        </View>

        <Text style={styles.eventsSectionTitle}>{t('home.upcomingEventsTitle')}</Text>
        {eventNotice ? <Text style={styles.eventsNotice}>{eventNotice}</Text> : null}
        {loadingEvents && clubEvents.length === 0 ? (
          <ActivityIndicator color={premium.accentBlue} style={styles.eventsLoader} />
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          snapToAlignment="start"
          decelerationRate="fast"
          style={styles.eventsRail}
          contentContainerStyle={styles.eventsRailInner}
        >
          {clubEvents.map((ev) => {
            return (
              <View key={ev.id} style={styles.eventCard}>
                <Pressable
                  style={({ pressed }) => [
                    styles.eventTapArea,
                    pressed && styles.eventTapAreaPressed,
                  ]}
                  onPress={() => setSelectedEvent(ev)}
                >
                  {ev.imageUrl ? (
                    <Image
                      source={{ uri: ev.imageUrl }}
                      style={styles.eventImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.eventImage, styles.eventImagePh]}>
                      <Text style={styles.eventImagePhTxt}>{t('events.noImage')}</Text>
                    </View>
                  )}
                  <View style={styles.eventCardBody}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {ev.title}
                    </Text>
                    <Text style={styles.eventMetaLine} numberOfLines={1}>
                      {t('events.locationLabel')}: {ev.location || '-'}
                    </Text>
                    <Text style={styles.eventMetaLine} numberOfLines={1}>
                      {t('events.dateLabel')}: {fmtDate(ev.startsAt)}
                    </Text>
                    <Text style={styles.eventMetaLine} numberOfLines={1}>
                      {t('events.startLabel')}: {fmtTime(ev.startsAt)}
                    </Text>
                    <Text style={styles.eventMetaLine} numberOfLines={1}>
                      {t('events.endLabel')}: {ev.endsAt ? fmtTime(ev.endsAt) : '-'}
                    </Text>
                    <Text style={styles.eventMetaLine} numberOfLines={1}>
                      {t('events.coachLabel')}: {ev.coachName || '-'}
                    </Text>
                    <Text style={styles.eventCapacity}>
                      {t('events.capacity', { booked: ev.bookedCount, capacity: ev.capacity })}
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
        {!loadingEvents && clubEvents.length === 0 ? (
          <Text style={styles.eventsEmpty}>{t('home.noUpcomingEvents')}</Text>
        ) : null}
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

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.todayClub}>{t('home.clubToday', { club: tenant.name })}</Text>
          <Text style={styles.todayGreet}>{t('home.greeting', { name: user.firstName })}</Text>
          {nextReservation ? (
            <>
              <Text style={styles.todayLabel}>{t('home.nextSessionLabel')}</Text>
              <Text style={styles.todayMeta}>
                {t('home.nextSessionMeta', {
                  time: fmt(nextReservation.startTime),
                  trainer: `${nextReservation.trainer.user.firstName} ${nextReservation.trainer.user.lastName}`,
                  type: nextReservation.package?.packageType?.name ?? t('home.unknownSessionType'),
                })}
              </Text>
              <Pressable
                {...ripple}
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
                onPress={scrollToBooking}
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
              <Pressable
                {...ripple}
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
                onPress={scrollToBooking}
              >
                <Text style={styles.btnPrimaryTxt}>
                  {activePackageCount > 0 ? t('home.ctaBookPt') : t('home.ctaExploreServices')}
                </Text>
              </Pressable>
            </>
          )}
        </GlassCard>

        <View style={styles.stripRow}>
          <View style={styles.chip}>
            <Text style={styles.chipTxt}>
              {t('home.packagesChip', { count: activePackageCount })}
            </Text>
          </View>
          <Pressable
            style={styles.chip}
            onPress={() => {
              loadReservations().catch(() => {});
              navigation.navigate('Reservations');
            }}
          >
            <Text style={styles.chipTxt}>
              {nextReservation
                ? `${t('home.reservationsChip')} · ${fmt(nextReservation.startTime)}`
                : t('home.reservationsChip')}
            </Text>
          </Pressable>
          <View style={[styles.chip, styles.chipMuted]}>
            <Text style={styles.chipTxt}>{t('home.announcementChip')}</Text>
          </View>
        </View>

        <Text style={styles.servicesHeading}>{t('home.servicesTitle')}</Text>
        <View style={styles.grid}>
          <Pressable
            style={({ pressed }) => [styles.svcCard, pressed && styles.svcCardPressed]}
            onPress={() => {
              setHubPlaceholder(null);
              scrollToBooking();
            }}
          >
            <Text style={styles.svcTitle}>{t('home.servicePtTitle')}</Text>
            <Text style={styles.svcSub}>{t('home.servicePtSubtitle')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.svcCard, pressed && styles.svcCardPressed]}
            onPress={() => setHubPlaceholder('massage')}
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

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.cardTitle}>{t('home.trainersTitle')}</Text>
          <Text style={styles.muted}>{t('home.trainersSubtitle')}</Text>
          {loadingTrainers && trainers.length === 0 ? (
            <ActivityIndicator color={premium.accentBlue} style={styles.spinnerPad} />
          ) : null}
          {!loadingTrainers && trainers.length === 0 ? (
            <Text style={styles.muted}>{t('home.trainersEmpty')}</Text>
          ) : null}
          {(trainersShowAll ? trainers : trainers.slice(0, 3)).map((tr) => (
            <Pressable
              key={tr.id}
              style={({ pressed }) => [styles.trainerRow, pressed && styles.trainerRowPressed]}
              onPress={() => selectTrainerAndScroll(tr.id)}
            >
              <Text style={styles.trainerName}>
                {tr.user.firstName} {tr.user.lastName}
              </Text>
              <Text style={styles.trainerCta}>{t('home.ctaBookPt')}</Text>
            </Pressable>
          ))}
          {trainers.length > 3 ? (
            <Pressable
              style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
              onPress={() => setTrainersShowAll((v) => !v)}
            >
              <Text style={styles.btnGhostTxt}>
                {trainersShowAll ? t('home.seeLess') : t('home.seeAll')}
              </Text>
            </Pressable>
          ) : null}
        </GlassCard>

        <View
          onLayout={(e) => {
            bookingSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.cardTitle}>{t('home.bookingHubTitle')}</Text>
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
            {slots.length === 0 ? (
              <Text style={styles.muted}>{t('booking.emptySlots')}</Text>
            ) : null}
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

            <Pressable
              {...ripple}
              style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
              onPress={() => navigation.navigate('Reservations')}
            >
              <Text style={styles.btnOutlineTxt}>{t('tabs.openReservations')}</Text>
            </Pressable>
          </GlassCard>
        </View>
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
    gap: 10,
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: premium.text,
  },
  eventsSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginTop: 8,
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
  todayClub: {
    fontSize: 12,
    fontWeight: '800',
    color: premium.accentGreen,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  todayGreet: {
    fontSize: 17,
    fontWeight: '700',
    color: premium.text,
    marginBottom: 12,
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
    marginBottom: 14,
  },
  stripRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  chipMuted: {
    opacity: 0.85,
  },
  chipTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.textMuted,
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
