import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  therapistId: string;
  therapistName: string;
  therapistPhoto: string | null;
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
  spaTherapist?: { id: string; name: string } | null;
  spaService?: { id: string; name: string } | null;
  trainer?: { user: { firstName: string; lastName: string } } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TAB_BAR_PAD = 100;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

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
  const day = dt.toLocaleDateString('tr-TR', { weekday: 'short' });
  const num = dt.getDate();
  return { day, num };
}
function canRefund(startTime: string): boolean {
  return new Date(startTime).getTime() - Date.now() > THREE_HOURS_MS;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SpaScreen() {
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();

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

  // Collapsible sections
  const [showServices, setShowServices] = useState(false);

  const opts = useMemo(
    () => ({ token: token ?? undefined, tenantSubdomain: tenant?.subdomain }),
    [token, tenant],
  );

  const loadData = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const [slotsRes, balanceRes, servicesRes, reservationsRes] = await Promise.all([
        apiJson<{ date: string; slots: Slot[] }>(`/spa/available-slots?date=${selectedDate}`, opts),
        apiJson<PackageBalance>('/spa/my-package-balance', opts),
        apiJson<ServiceRow[]>('/spa/services', opts),
        apiJson<MyReservation[]>('/reservations?limit=20', opts),
      ]);
      setSlots(slotsRes.slots);
      setBalance(balanceRes);
      setServices(servicesRes);
      // Filter only spa reservations (confirmed/pending)
      setMyReservations(
        reservationsRes.filter(
          (r) =>
            r.spaTherapist &&
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
    }, [loadData]),
  );

  useEffect(() => {
    void loadData();
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBook() {
    if (!bookingSlot || !selectedServiceId) return;
    setBooking(true);
    try {
      await apiJson('/spa/book-slot', {
        ...opts,
        method: 'POST',
        body: JSON.stringify({
          availabilityId: bookingSlot.availabilityId,
          serviceId: selectedServiceId,
        }),
      });
      Alert.alert('✅ Randevu Oluşturuldu', 'Masaj randevunuz onaylandı. İyi seanslar!');
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
    const msg = willRefund
      ? 'Randevunuz iptal edilecek ve 1 seans paketinize iade edilecek.'
      : '⚠️ Randevu başlangıcına 3 saatten az kaldığı için iptal edebilirsiniz ancak seans hakkınız iade edilmeyecektir.';
    Alert.alert('Randevu İptali', msg, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: willRefund ? 'İptal Et (İade)' : 'İptal Et (Hak Yanar)',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiJson(`/spa/cancel/${reservationId}`, { ...opts, method: 'POST' });
            Alert.alert('✅', willRefund ? 'İptal edildi, 1 seans iade edildi.' : 'İptal edildi.');
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

  if (loading && !refreshing) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 60 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
        </View>
      </GradientBackground>
    );
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
              setRefreshing(true);
              void loadData();
            }}
            tintColor={premium.accentBlue}
          />
        }
      >
        {/* Header */}
        <Text style={styles.title}>💆 Spa & Masaj</Text>
        <Text style={styles.subtitle}>Müsait saatleri seç, hemen randevu al</Text>

        {/* Package Balance */}
        <GlassCard style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Kalan Masaj Hakkı</Text>
              <Text style={styles.balanceValue}>{balance?.remainingSessions ?? 0}</Text>
            </View>
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceBadgeText}>
                {(balance?.remainingSessions ?? 0) > 0 ? '✅ Aktif' : '❌ Paket Yok'}
              </Text>
            </View>
          </View>
          {(balance?.remainingSessions ?? 0) === 0 && (
            <Text style={styles.noPackageHint}>
              Masaj randevusu almak için aktif bir paketiniz olmalıdır. Kulüp resepsiyonundan paket
              satın alabilirsiniz.
            </Text>
          )}
          <Text style={styles.cancelRule}>
            ⏰ İptal kuralı: Randevu başlangıcından en az 3 saat önce iptal ederseniz hakkınız iade
            edilir. 3 saatten az kala iptal ederseniz hakkınız kullanılmış sayılır.
          </Text>
        </GlassCard>

        {/* Date Strip */}
        <View style={styles.dateStrip}>
          {dateStrip.map((d) => (
            <Pressable
              key={d.date}
              style={[
                styles.dateChip,
                d.date === selectedDate && styles.dateChipActive,
                d.isToday && styles.dateChipToday,
              ]}
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
            </Pressable>
          ))}
        </View>

        {/* Available Slots */}
        <Text style={styles.sectionTitle}>
          Müsait Saatler ·{' '}
          {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
          })}
        </Text>
        {slots.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>Bu tarihte müsait saat bulunmuyor.</Text>
          </GlassCard>
        ) : (
          slots.map((slot) => (
            <Pressable
              key={slot.availabilityId}
              style={({ pressed }) => [styles.slotCard, pressed && styles.slotCardPressed]}
              onPress={() => {
                if ((balance?.remainingSessions ?? 0) === 0) {
                  Alert.alert(
                    'Paket Gerekli',
                    'Masaj randevusu almak için aktif bir masaj paketiniz olmalıdır. Lütfen kulüp resepsiyonuyla iletişime geçin.',
                  );
                  return;
                }
                setBookingSlot(slot);
                setSelectedServiceId('');
              }}
            >
              <View style={styles.slotLeft}>
                <Text style={styles.slotTime}>
                  {slot.startTime} - {slot.endTime}
                </Text>
                <Text style={styles.slotTherapist}>💆 {slot.therapistName}</Text>
              </View>
              <View style={styles.slotRight}>
                <Text style={styles.slotCta}>Randevu Al →</Text>
              </View>
            </Pressable>
          ))
        )}

        {/* My Upcoming Reservations */}
        {myReservations.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Yaklaşan Randevularım</Text>
            {myReservations.map((r) => {
              const refundable = canRefund(r.startTime);
              return (
                <GlassCard key={r.id} style={styles.resCard}>
                  <View style={styles.resRow}>
                    <View>
                      <Text style={styles.resTime}>
                        {new Date(r.startTime).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        ·{' '}
                        {new Date(r.startTime).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Text style={styles.resDetail}>
                        💆 {r.spaTherapist?.name ?? ''}{' '}
                        {r.spaService ? `· ${r.spaService.name}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.cancelBtn, !refundable && styles.cancelBtnWarn]}
                      onPress={() => void handleCancel(r.id, r.startTime)}
                    >
                      <Text style={styles.cancelBtnText}>{refundable ? 'İptal' : 'İptal ⚠️'}</Text>
                    </Pressable>
                  </View>
                  {!refundable && (
                    <Text style={styles.warnText}>
                      ⚠️ 3 saatten az kaldı — iptal ederseniz hakkınız iade edilmez
                    </Text>
                  )}
                </GlassCard>
              );
            })}
          </>
        )}

        {/* Services Collapsible */}
        <Pressable style={styles.collapseHeader} onPress={() => setShowServices(!showServices)}>
          <Text style={styles.collapseTitle}>
            {showServices ? '▼' : '▶'} Hizmetlerimiz ({services.length})
          </Text>
        </Pressable>
        {showServices &&
          services.map((s) => (
            <GlassCard key={s.id} style={styles.serviceCard}>
              <Text style={styles.serviceName}>{s.name}</Text>
              <Text style={styles.serviceMeta}>
                {s.durationMinutes} dk · {s.price} ₺ · {s.category}
              </Text>
              {s.description && <Text style={styles.serviceDesc}>{s.description}</Text>}
            </GlassCard>
          ))}
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={!!bookingSlot} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Masaj Randevusu</Text>
            {bookingSlot && (
              <>
                <Text style={styles.modalSub}>
                  {selectedDate} · {bookingSlot.startTime}-{bookingSlot.endTime} ·{' '}
                  {bookingSlot.therapistName}
                </Text>

                <Text style={styles.modalLabel}>Hizmet Seçin *</Text>
                <View style={styles.serviceList}>
                  {services.map((s) => (
                    <Pressable
                      key={s.id}
                      style={[
                        styles.serviceOption,
                        selectedServiceId === s.id && styles.serviceOptionActive,
                      ]}
                      onPress={() => setSelectedServiceId(s.id)}
                    >
                      <Text
                        style={[
                          styles.serviceOptionText,
                          selectedServiceId === s.id && styles.serviceOptionTextActive,
                        ]}
                      >
                        {s.name}
                      </Text>
                      <Text style={styles.serviceOptionMeta}>
                        {s.durationMinutes} dk · {s.price} ₺
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    onPress={() => void handleBook()}
                    disabled={!selectedServiceId || booking}
                  >
                    <Text style={styles.modalBtnPrimaryText}>{booking ? '⏳...' : '✓ Onayla'}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    onPress={() => setBookingSlot(null)}
                  >
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
  scroll: { paddingHorizontal: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },
  title: { fontSize: 26, fontWeight: '800', color: premium.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: premium.textMuted, marginBottom: 16 },

  // Balance
  balanceCard: { marginBottom: 16 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: premium.textMuted, marginBottom: 4 },
  balanceValue: { fontSize: 36, fontWeight: '900', color: premium.accentBlue },
  balanceBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  balanceBadgeText: { fontSize: 12, fontWeight: '700', color: '#22c55e' },
  noPackageHint: { fontSize: 12, color: '#f59e0b', marginTop: 10, lineHeight: 18 },
  cancelRule: {
    fontSize: 11,
    color: premium.textMuted,
    marginTop: 12,
    lineHeight: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(148,163,184,0.2)',
    paddingTop: 10,
  },

  // Date strip
  dateStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateChip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(148,163,184,0.08)',
    minWidth: 44,
  },
  dateChipActive: { backgroundColor: premium.accentBlue },
  dateChipToday: { borderWidth: 1, borderColor: premium.accentBlue },
  dateChipDay: { fontSize: 11, color: premium.textMuted, fontWeight: '600' },
  dateChipDayActive: { color: '#fff' },
  dateChipNum: { fontSize: 16, fontWeight: '800', color: premium.text, marginTop: 2 },
  dateChipNumActive: { color: '#fff' },

  // Section
  sectionTitle: { fontSize: 16, fontWeight: '700', color: premium.text, marginBottom: 10 },

  // Slots
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(148,163,184,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  slotCardPressed: { backgroundColor: 'rgba(56,189,248,0.1)' },
  slotLeft: {},
  slotTime: { fontSize: 16, fontWeight: '800', color: premium.text },
  slotTherapist: { fontSize: 13, color: premium.textMuted, marginTop: 3 },
  slotRight: {},
  slotCta: { fontSize: 13, fontWeight: '700', color: premium.accentBlue },

  // Empty
  emptyCard: { paddingVertical: 24 },
  emptyText: { fontSize: 14, color: premium.textMuted, textAlign: 'center' },

  // Reservations
  resCard: { marginBottom: 8 },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resTime: { fontSize: 14, fontWeight: '700', color: premium.text },
  resDetail: { fontSize: 12, color: premium.textMuted, marginTop: 3 },
  cancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cancelBtnWarn: { backgroundColor: 'rgba(245,158,11,0.15)' },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  warnText: { fontSize: 11, color: '#f59e0b', marginTop: 8 },

  // Collapsible
  collapseHeader: { paddingVertical: 14, marginTop: 20 },
  collapseTitle: { fontSize: 15, fontWeight: '700', color: premium.text },

  // Service cards
  serviceCard: { marginBottom: 8 },
  serviceName: { fontSize: 15, fontWeight: '700', color: premium.text },
  serviceMeta: { fontSize: 12, color: premium.accentBlue, marginTop: 3 },
  serviceDesc: { fontSize: 12, color: premium.textMuted, marginTop: 6, lineHeight: 17 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: premium.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: premium.textMuted, marginBottom: 16 },
  modalLabel: { fontSize: 13, color: premium.textMuted, marginBottom: 8, fontWeight: '600' },
  serviceList: { marginBottom: 16 },
  serviceOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    marginBottom: 8,
  },
  serviceOptionActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.1)' },
  serviceOptionText: { fontSize: 14, fontWeight: '700', color: premium.text },
  serviceOptionTextActive: { color: premium.accentBlue },
  serviceOptionMeta: { fontSize: 12, color: premium.textMuted, marginTop: 3 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnPrimary: { backgroundColor: premium.accentBlue },
  modalBtnPrimaryText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  modalBtnSecondary: { backgroundColor: 'rgba(148,163,184,0.12)' },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: '700', color: premium.textMuted },
});
