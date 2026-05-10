import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';

// ─── Types ────────────────────────────────────────────────────────────────────
type Slot = {
  availabilityId: string;
  trainerId: string;
  trainerName: string;
  trainerPhoto: string | null;
  startTime: string;
  endTime: string;
};
type PackageBalance = {
  remainingSessions: number;
  packages: Array<{
    id: string;
    packageTypeName: string;
    remainingSessions: number;
    expiresAt: string;
  }>;
};
type ServiceRow = {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: string;
  description: string | null;
};
type MyReservation = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  trainer?: { user: { firstName: string; lastName: string } } | null;
  package?: { packageTypeName: string } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TAB_BAR_PAD = 100;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const CATEGORY_ICONS: Record<string, string> = {
  relax: '🧘',
  therapy: '💆',
  recovery: '🔄',
  sport: '🏋️',
  premium: '👑',
  cold: '🧊',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(d: string, n: number) {
  const dt = new Date(`${d}T12:00:00`);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}
function dayLabel(d: string) {
  const dt = new Date(`${d}T12:00:00`);
  return {
    day: dt.toLocaleDateString('tr-TR', { weekday: 'short' }),
    num: dt.getDate(),
    month: dt.toLocaleDateString('tr-TR', { month: 'short' }),
  };
}
function canRefund(startTime: string): boolean {
  return new Date(startTime).getTime() - Date.now() > THREE_HOURS_MS;
}
function hoursUntil(startTime: string): number {
  return Math.max(0, Math.round((new Date(startTime).getTime() - Date.now()) / 3600000));
}

// ─── Circular Progress Ring ───────────────────────────────────────────────────
function ProgressRing({
  remaining,
  total,
  size = 72,
}: {
  remaining: number;
  total: number;
  size?: number;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? remaining / total : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background circle */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'rgba(148,163,184,0.15)',
        }}
      />
      {/* Progress circle (simplified — full circle colored portion) */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: remaining > 0 ? premium.accentGreen : premium.danger,
          borderTopColor:
            progress >= 0.25
              ? remaining > 0
                ? premium.accentGreen
                : premium.danger
              : 'transparent',
          borderRightColor:
            progress >= 0.5
              ? remaining > 0
                ? premium.accentGreen
                : premium.danger
              : 'transparent',
          borderBottomColor:
            progress >= 0.75
              ? remaining > 0
                ? premium.accentGreen
                : premium.danger
              : 'transparent',
          borderLeftColor:
            progress >= 1 ? (remaining > 0 ? premium.accentGreen : premium.danger) : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      <Text style={{ fontSize: 20, fontWeight: '900', color: premium.text }}>{remaining}</Text>
      <Text style={{ fontSize: 9, color: premium.textMuted, marginTop: -2 }}>kalan</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PtScreen() {
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [balance, setBalance] = useState<PackageBalance | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [myReservations, setMyReservations] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Booking modal
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [booking, setBooking] = useState(false);

  // Sections
  const [showServices, setShowServices] = useState(false);
  const [showTherapists, setShowTherapists] = useState(false);

  const opts = useMemo(
    () => ({ token: token ?? undefined, tenantSubdomain: tenant?.subdomain }),
    [token, tenant],
  );

  const totalSessions = useMemo(() => {
    if (!balance?.packages.length) return 0;
    return (
      balance.packages.reduce((s, p) => s + p.remainingSessions, 0) +
      (balance.remainingSessions - balance.packages.reduce((s, p) => s + p.remainingSessions, 0))
    );
  }, [balance]);

  const loadData = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const [slotsRes, balanceRes, servicesRes, reservationsRes] = await Promise.all([
        apiJson<{ date: string; slots: Slot[] }>(`/pt/available-slots?date=${selectedDate}`, opts),
        apiJson<PackageBalance>('/pt/my-package-balance', opts),
        apiJson<ServiceRow[]>('/trainers', opts),
        apiJson<MyReservation[]>('/reservations?limit=20', opts),
      ]);
      setSlots(slotsRes.slots);
      setBalance(balanceRes);
      setServices(servicesRes);
      setMyReservations(
        reservationsRes.filter(
          (r) =>
            (r.status === 'confirmed' || r.status === 'pending') &&
            new Date(r.startTime) > new Date(),
        ),
      );
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, tenant, selectedDate, opts]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadData();
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, [loadData, fadeAnim]),
  );

  useEffect(() => {
    void loadData();
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBook() {
    if (!bookingSlot || !selectedServiceId) return;
    setBooking(true);
    try {
      await apiJson('/pt/book-slot', {
        ...opts,
        method: 'POST',
        body: JSON.stringify({
          availabilityId: bookingSlot.availabilityId,
          serviceId: selectedServiceId || 'pt',
        }),
      });
      Alert.alert(
        '✅ Randevu Onaylandı',
        `${bookingSlot.trainerName} ile randevunuz oluşturuldu.\n\n⏰ İptal için en az 3 saat öncesinden işlem yapmanız gerekmektedir.`,
      );
      setBookingSlot(null);
      setSelectedServiceId('');
      void loadData();
    } catch (e) {
      Alert.alert('Randevu', e instanceof ApiError ? e.message : 'Randevu oluşturulamadı');
    } finally {
      setBooking(false);
    }
  }

  async function handleCancel(reservationId: string, startTime: string) {
    const willRefund = canRefund(startTime);
    const hours = hoursUntil(startTime);
    const msg = willRefund
      ? `Randevunuz iptal edilecek ve 1 seans hakkınız paketinize iade edilecektir.\n\nRandevuya ${hours} saat var.`
      : `⚠️ DİKKAT: Randevu başlangıcına ${hours} saatten az kaldığı için iptal edebilirsiniz ancak seans hakkınız iade edilmeyecektir.\n\n1 masaj hakkınız kullanılmış sayılacaktır.`;
    Alert.alert('Randevu İptali', msg, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: willRefund ? 'İptal Et' : 'Yine de İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiJson<{ refunded: boolean; message: string }>(
              `/pt/cancel/${reservationId}`,
              { ...opts, method: 'POST' },
            );
            Alert.alert(
              res.refunded ? '✅ İptal Edildi' : '⚠️ İptal Edildi',
              res.refunded
                ? '1 seans hakkınız paketinize iade edildi.'
                : 'Seans hakkınız iade edilmedi (3 saat kuralı).',
            );
            void loadData();
          } catch (e) {
            Alert.alert('Hata', e instanceof ApiError ? e.message : 'İptal başarısız');
          }
        },
      },
    ]);
  }

  // ─── Date strip ─────────────────────────────────────────────────────────────
  const dateStrip = useMemo(() => {
    const today = todayISO();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i);
      const { day, num } = dayLabel(d);
      return { date: d, day, num, isToday: i === 0 };
    });
  }, []);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
          <Text style={styles.loadingText}>Spa yükleniyor...</Text>
        </View>
      </GradientBackground>
    );
  }

  const remaining = balance?.remainingSessions ?? 0;
  const maxSessions = remaining + 5; // approximate for ring visual

  return (
    <GradientBackground>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top, paddingBottom: insets.bottom + TAB_BAR_PAD },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadData();
            }}
            tintColor={premium.accentBlue}
          />
        }
      >
        {/* ═══ Hero Banner ═══ */}
        <View style={styles.hero}>
          <View style={styles.heroGradient}>
            <Text style={styles.heroEmoji}>🏋️‍♂️</Text>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>Personal Training</Text>
              <Text style={styles.heroSub}>Eğitmeninizle özel ders randevusu alın</Text>
            </View>
          </View>
        </View>

        {/* ═══ Package Balance Card ═══ */}
        <GlassCard style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <Text style={styles.balanceLabel}>PT Paketim</Text>
              {remaining > 0 ? (
                <View style={styles.balanceStatusRow}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>Aktif Paket</Text>
                </View>
              ) : (
                <View style={styles.balanceStatusRow}>
                  <View style={[styles.activeDot, { backgroundColor: premium.danger }]} />
                  <Text style={[styles.activeText, { color: premium.danger }]}>Paket Yok</Text>
                </View>
              )}
              {remaining === 0 && (
                <Text style={styles.noPackageHint}>
                  Randevu almak için kulüp resepsiyonundan PT paketi satın alın.
                </Text>
              )}
            </View>
            <ProgressRing remaining={remaining} total={Math.max(remaining, maxSessions)} />
          </View>
          <View style={styles.ruleBox}>
            <Text style={styles.ruleIcon}>⏰</Text>
            <Text style={styles.ruleText}>
              3 saat öncesine kadar ücretsiz iptal. 3 saatten az kala iptal ederseniz seans hakkınız
              kullanılmış sayılır.
            </Text>
          </View>
        </GlassCard>

        {/* ═══ Date Strip ═══ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStripContainer}
          style={styles.dateStripScroll}
        >
          {dateStrip.map((d) => (
            <Pressable
              key={d.date}
              style={[styles.dateChip, d.date === selectedDate && styles.dateChipActive]}
              onPress={() => setSelectedDate(d.date)}
            >
              <Text
                style={[styles.dateChipDay, d.date === selectedDate && styles.dateChipDayActive]}
              >
                {d.day}
              </Text>
              <Text
                style={[styles.dateChipNum, d.date === selectedDate && styles.dateChipNumActive]}
              >
                {d.num}
              </Text>
              {d.isToday && <View style={styles.todayDot} />}
            </Pressable>
          ))}
        </ScrollView>

        {/* ═══ Available Slots ═══ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Müsait PT Saatleri</Text>
          <Text style={styles.sectionBadge}>{slots.length} slot</Text>
        </View>

        {slots.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🙅‍♀️</Text>
            <Text style={styles.emptyTitle}>Müsait saat yok</Text>
            <Text style={styles.emptyDesc}>
              Bu tarihte açık PT saati bulunmuyor. Başka bir gün deneyin.
            </Text>
          </GlassCard>
        ) : (
          slots.map((slot, idx) => (
            <Pressable
              key={slot.availabilityId}
              style={({ pressed }) => [styles.slotCard, pressed && styles.slotCardPressed]}
              onPress={() => {
                if (remaining === 0) {
                  Alert.alert(
                    'Paket Gerekli',
                    'PT randevusu almak için aktif bir PT paketiniz olmalıdır.\n\nKulüp resepsiyonundan paket satın alabilirsiniz.',
                  );
                  return;
                }
                setBookingSlot(slot);
                setSelectedServiceId('');
              }}
            >
              {/* Therapist Avatar */}
              <View style={styles.slotAvatar}>
                {slot.trainerPhoto ? (
                  <Image source={{ uri: slot.trainerPhoto }} style={styles.slotAvatarImg} />
                ) : (
                  <View style={styles.slotAvatarFallback}>
                    <Text style={styles.slotAvatarLetter}>
                      {slot.trainerName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              {/* Slot Info */}
              <View style={styles.slotInfo}>
                <Text style={styles.slotTime}>
                  {slot.startTime} - {slot.endTime}
                </Text>
                <Text style={styles.slotTherapist}>{slot.trainerName}</Text>
              </View>
              {/* CTA */}
              <View style={styles.slotCta}>
                <Text style={styles.slotCtaText}>Randevu Al</Text>
                <Text style={styles.slotCtaArrow}>→</Text>
              </View>
            </Pressable>
          ))
        )}

        {/* ═══ My Upcoming Reservations ═══ */}
        {myReservations.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Yaklaşan Randevularım</Text>
              <Text style={styles.sectionBadge}>{myReservations.length}</Text>
            </View>
            {myReservations.map((r) => {
              const refundable = canRefund(r.startTime);
              const hours = hoursUntil(r.startTime);
              return (
                <GlassCard key={r.id} style={styles.resCard}>
                  <View style={styles.resTop}>
                    <View>
                      <Text style={styles.resTime}>
                        📅{' '}
                        {new Date(r.startTime).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                        })}{' '}
                        ·{' '}
                        {new Date(r.startTime).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Text style={styles.resDetail}>
                        🏋️{' '}
                        {r.trainer?.user
                          ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`
                          : ''}{' '}
                        {r.package?.packageTypeName ? `· ${r.package.packageTypeName}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.cancelBtn, !refundable && styles.cancelBtnWarn]}
                      onPress={() => void handleCancel(r.id, r.startTime)}
                    >
                      <Text style={[styles.cancelBtnText, !refundable && styles.cancelBtnTextWarn]}>
                        İptal
                      </Text>
                    </Pressable>
                  </View>
                  <View style={[styles.resTimeBadge, !refundable && styles.resTimeBadgeWarn]}>
                    <Text
                      style={[styles.resTimeBadgeText, !refundable && styles.resTimeBadgeTextWarn]}
                    >
                      {refundable
                        ? `✅ ${hours} saat sonra · Ücretsiz iptal hakkınız var`
                        : `⚠️ ${hours} saat sonra · İptal ederseniz hakkınız yanar`}
                    </Text>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}

        {/* ═══ Services Section (Collapsible) ═══ */}
        <Pressable style={styles.collapseHeader} onPress={() => setShowServices(!showServices)}>
          <Text style={styles.collapseTitle}>{showServices ? '▼' : '▶'} Eğitmenlerimiz</Text>
          <View style={styles.collapseBadge}>
            <Text style={styles.collapseBadgeText}>{services.length}</Text>
          </View>
        </Pressable>
        {showServices && (
          <View style={styles.servicesGrid}>
            {services.map((s) => (
              <GlassCard key={s.id} style={styles.serviceCard}>
                <View style={styles.serviceTop}>
                  <Text style={styles.serviceIcon}>{CATEGORY_ICONS[s.category] ?? '💆'}</Text>
                  <View style={styles.servicePriceBadge}>
                    <Text style={styles.servicePriceText}>{s.price} ₺</Text>
                  </View>
                </View>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.serviceDuration}>{s.durationMinutes} dakika</Text>
                {s.description && (
                  <Text style={styles.serviceDesc} numberOfLines={2}>
                    {s.description}
                  </Text>
                )}
              </GlassCard>
            ))}
          </View>
        )}
      </Animated.ScrollView>

      {/* ═══ Booking Modal (Bottom Sheet) ═══ */}
      <Modal visible={!!bookingSlot} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setBookingSlot(null)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Randevu Oluştur</Text>
            {bookingSlot && (
              <>
                <View style={styles.modalSlotInfo}>
                  <View style={styles.modalSlotAvatar}>
                    {bookingSlot.trainerPhoto ? (
                      <Image
                        source={{ uri: bookingSlot.trainerPhoto }}
                        style={styles.modalSlotAvatarImg}
                      />
                    ) : (
                      <View style={styles.modalSlotAvatarFallback}>
                        <Text style={styles.modalSlotAvatarLetter}>
                          {bookingSlot.trainerName.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View>
                    <Text style={styles.modalSlotName}>{bookingSlot.trainerName}</Text>
                    <Text style={styles.modalSlotTime}>
                      {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                      })}{' '}
                      · {bookingSlot.startTime} - {bookingSlot.endTime}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalLabel}>Hizmet Seçin</Text>
                <ScrollView style={styles.serviceListScroll} showsVerticalScrollIndicator={false}>
                  {services.map((s) => (
                    <Pressable
                      key={s.id}
                      style={[
                        styles.serviceOption,
                        selectedServiceId === s.id && styles.serviceOptionActive,
                      ]}
                      onPress={() => setSelectedServiceId(s.id)}
                    >
                      <View style={styles.serviceOptionLeft}>
                        <Text style={styles.serviceOptionIcon}>
                          {CATEGORY_ICONS[s.category] ?? '💆'}
                        </Text>
                        <View>
                          <Text
                            style={[
                              styles.serviceOptionText,
                              selectedServiceId === s.id && styles.serviceOptionTextActive,
                            ]}
                          >
                            {s.name}
                          </Text>
                          <Text style={styles.serviceOptionMeta}>{s.durationMinutes} dk</Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.serviceOptionPrice,
                          selectedServiceId === s.id && styles.serviceOptionPriceActive,
                        ]}
                      >
                        {s.price} ₺
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={styles.modalNote}>
                  <Text style={styles.modalNoteText}>
                    ⏰ Randevu başlangıcından 3 saat öncesine kadar ücretsiz iptal edebilirsiniz.
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={[
                      styles.modalBtnPrimary,
                      (!selectedServiceId || booking) && styles.modalBtnDisabled,
                    ]}
                    onPress={() => void handleBook()}
                    disabled={!selectedServiceId || booking}
                  >
                    <Text style={styles.modalBtnPrimaryText}>
                      {booking ? '⏳ Oluşturuluyor...' : '✓ Randevuyu Onayla'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.modalBtnSecondary} onPress={() => setBookingSlot(null)}>
                    <Text style={styles.modalBtnSecondaryText}>Vazgeç</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: premium.textMuted, marginTop: 12, fontSize: 14 },
  scroll: { paddingHorizontal: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },

  // Hero
  hero: { marginBottom: 20, marginTop: 8 },
  heroGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
    borderRadius: premium.radiusLg,
    padding: 20,
  },
  heroEmoji: { fontSize: 44, marginRight: 16 },
  heroTextBlock: { flex: 1 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: premium.text },
  heroSub: { fontSize: 13, color: premium.textMuted, marginTop: 4, lineHeight: 18 },

  // Balance
  balanceCard: { marginBottom: 20 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLeft: { flex: 1, marginRight: 16 },
  balanceLabel: { fontSize: 16, fontWeight: '700', color: premium.text, marginBottom: 6 },
  balanceStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: premium.accentGreen },
  activeText: { fontSize: 13, fontWeight: '600', color: premium.accentGreen },
  noPackageHint: { fontSize: 12, color: '#f59e0b', marginTop: 8, lineHeight: 17 },
  ruleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(148,163,184,0.15)',
    gap: 8,
  },
  ruleIcon: { fontSize: 16 },
  ruleText: { flex: 1, fontSize: 12, color: premium.textMuted, lineHeight: 17 },

  // Date strip
  dateStripScroll: { marginBottom: 20 },
  dateStripContainer: { gap: 8, paddingHorizontal: 2 },
  dateChip: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(148,163,184,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    minWidth: 50,
  },
  dateChipActive: {
    backgroundColor: premium.accentBlue,
    borderColor: premium.accentBlue,
  },
  dateChipDay: {
    fontSize: 11,
    color: premium.textMuted,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateChipDayActive: { color: '#fff' },
  dateChipNum: { fontSize: 18, fontWeight: '900', color: premium.text, marginTop: 2 },
  dateChipNumActive: { color: '#fff' },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: premium.accentGreen,
    marginTop: 4,
  },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: premium.text },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  // Slots
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(148,163,184,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    borderRadius: premium.radiusMd,
    padding: 14,
    marginBottom: 10,
  },
  slotCardPressed: { backgroundColor: 'rgba(56,189,248,0.08)', borderColor: premium.accentBlue },
  slotAvatar: { marginRight: 12 },
  slotAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  slotAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56,189,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  slotAvatarLetter: { fontSize: 18, fontWeight: '800', color: premium.accentBlue },
  slotInfo: { flex: 1 },
  slotTime: { fontSize: 16, fontWeight: '800', color: premium.text },
  slotTherapist: { fontSize: 13, color: premium.textMuted, marginTop: 2 },
  slotCta: { alignItems: 'flex-end' },
  slotCtaText: { fontSize: 12, fontWeight: '700', color: premium.accentBlue },
  slotCtaArrow: { fontSize: 18, color: premium.accentBlue, marginTop: 2 },

  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: premium.text },
  emptyDesc: {
    fontSize: 13,
    color: premium.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  // Reservations
  resCard: { marginBottom: 10 },
  resTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resTime: { fontSize: 14, fontWeight: '700', color: premium.text },
  resDetail: { fontSize: 12, color: premium.textMuted, marginTop: 4 },
  cancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  cancelBtnWarn: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  cancelBtnTextWarn: { color: '#f59e0b' },
  resTimeBadge: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  resTimeBadgeWarn: { backgroundColor: 'rgba(245,158,11,0.08)' },
  resTimeBadgeText: { fontSize: 11, color: premium.accentGreen, fontWeight: '600' },
  resTimeBadgeTextWarn: { color: '#f59e0b' },

  // Collapsible
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(148,163,184,0.15)',
    gap: 8,
  },
  collapseTitle: { fontSize: 16, fontWeight: '700', color: premium.text, flex: 1 },
  collapseBadge: {
    backgroundColor: 'rgba(148,163,184,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  collapseBadgeText: { fontSize: 11, fontWeight: '700', color: premium.textMuted },

  // Services grid
  servicesGrid: { gap: 10 },
  serviceCard: { padding: 16 },
  serviceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceIcon: { fontSize: 28 },
  servicePriceBadge: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  servicePriceText: { fontSize: 13, fontWeight: '800', color: premium.accentBlue },
  serviceName: { fontSize: 15, fontWeight: '700', color: premium.text },
  serviceDuration: { fontSize: 12, color: premium.textMuted, marginTop: 3 },
  serviceDesc: { fontSize: 12, color: premium.textMuted, marginTop: 6, lineHeight: 17 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', color: premium.text, marginBottom: 16 },
  modalSlotInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  modalSlotAvatar: {},
  modalSlotAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: premium.accentBlue,
  },
  modalSlotAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56,189,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSlotAvatarLetter: { fontSize: 20, fontWeight: '800', color: premium.accentBlue },
  modalSlotName: { fontSize: 16, fontWeight: '700', color: premium.text },
  modalSlotTime: { fontSize: 13, color: premium.textMuted, marginTop: 2 },
  modalLabel: { fontSize: 14, fontWeight: '700', color: premium.text, marginBottom: 10 },
  serviceListScroll: { maxHeight: 240 },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    marginBottom: 8,
  },
  serviceOptionActive: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  serviceOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceOptionIcon: { fontSize: 22 },
  serviceOptionText: { fontSize: 14, fontWeight: '700', color: premium.text },
  serviceOptionTextActive: { color: premium.accentBlue },
  serviceOptionMeta: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  serviceOptionPrice: { fontSize: 14, fontWeight: '800', color: premium.textMuted },
  serviceOptionPriceActive: { color: premium.accentBlue },
  modalNote: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  modalNoteText: { fontSize: 12, color: '#f59e0b', lineHeight: 17 },
  modalActions: { gap: 10 },
  modalBtnPrimary: {
    backgroundColor: premium.accentBlue,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalBtnDisabled: { opacity: 0.4 },
  modalBtnPrimaryText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  modalBtnSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: '600', color: premium.textMuted },
});
