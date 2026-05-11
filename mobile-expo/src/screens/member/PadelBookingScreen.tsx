import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { showToast } from '../../components/premium/Toast';
import { premium } from '../../theme/premiumTheme';
import type { MemberTabParamList } from '../../navigation/memberTabTypes';

type Resource = {
  id: string;
  name: string;
  resourceType: string;
  capacity: number;
  durationMinutes: number;
  price: string;
  currency: string;
  description: string | null;
  imageUrl: string | null;
};

type Slot = {
  id: string;
  resourceId: string;
  resourceName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: string;
  status: string;
};

type Addon = {
  id: string;
  name: string;
  price: string;
  description: string | null;
};

type MyBooking = {
  id: string;
  resourceName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

const DEFAULT_SUBDOMAIN = 'opadel';

export function PadelBookingScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useMemberAuth();
  const route = useRoute<RouteProp<MemberTabParamList, 'Padel'>>();
  const paramSubdomain = route.params?.subdomain;
  const paramClubName = route.params?.clubName;
  const PADEL_SUBDOMAIN = paramSubdomain || DEFAULT_SUBDOMAIN;

  const [step, setStep] = useState<'courts' | 'slots' | 'confirm' | 'bookings'>('courts');
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [participantCount, setParticipantCount] = useState('2');
  const [notes, setNotes] = useState('');
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load resources
  const loadResources = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiJson<Resource[]>(
        `/resource-booking/resources?tenant=${PADEL_SUBDOMAIN}`,
        { token },
      );
      setResources(res);
    } catch {
      /* ignore */
    }
  }, [token]);

  // Load slots for selected resource + date
  const loadSlots = useCallback(async () => {
    if (!token || !selectedResource) return;
    try {
      const res = await apiJson<Slot[]>(
        `/resource-booking/slots?tenant=${PADEL_SUBDOMAIN}&resourceId=${selectedResource.id}&date=${selectedDate}`,
        { token },
      );
      setSlots(res);
    } catch {
      setSlots([]);
    }
  }, [token, selectedResource, selectedDate]);

  // Load addons
  const loadAddons = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiJson<Addon[]>(`/resource-booking/addons?tenant=${PADEL_SUBDOMAIN}`, {
        token,
      });
      setAddons(res);
    } catch {
      /* ignore */
    }
  }, [token]);

  // Load my bookings
  const loadMyBookings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiJson<MyBooking[]>(
        `/resource-booking/my-bookings?tenant=${PADEL_SUBDOMAIN}`,
        { token },
      );
      setMyBookings(res);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadResources(), loadAddons(), loadMyBookings()]);
      setLoading(false);
    })();
  }, [loadResources, loadAddons, loadMyBookings]);

  useEffect(() => {
    if (step === 'slots' && selectedResource) {
      loadSlots();
    }
  }, [step, selectedResource, selectedDate, loadSlots]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (step === 'courts') await loadResources();
    else if (step === 'slots') await loadSlots();
    else if (step === 'bookings') await loadMyBookings();
    setRefreshing(false);
  };

  const handleSelectCourt = (r: Resource) => {
    setSelectedResource(r);
    setSelectedSlot(null);
    setStep('slots');
  };

  const handleSelectSlot = (s: Slot) => {
    setSelectedSlot(s);
    setSelectedAddons({});
    setStep('confirm');
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) => {
      const copy = { ...prev };
      if (copy[addonId]) {
        delete copy[addonId];
      } else {
        copy[addonId] = 1;
      }
      return copy;
    });
  };

  const calculateTotal = () => {
    let total = parseFloat(selectedSlot?.price ?? '0');
    for (const [addonId, qty] of Object.entries(selectedAddons)) {
      const addon = addons.find((a) => a.id === addonId);
      if (addon) total += parseFloat(addon.price) * qty;
    }
    return total;
  };

  const handleBook = async () => {
    if (!token || !selectedSlot) return;
    setBooking(true);
    try {
      const addonList = Object.entries(selectedAddons)
        .filter(([, qty]) => qty > 0)
        .map(([addonId, quantity]) => ({ addonId, quantity }));

      await apiJson(`/resource-booking/book?tenant=${PADEL_SUBDOMAIN}`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          resourceSlotId: selectedSlot.id,
          participantCount: parseInt(participantCount) || 2,
          addons: addonList.length > 0 ? addonList : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      showToast('Rezervasyon oluşturuldu! ✅', 'success');
      setStep('bookings');
      await loadMyBookings();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Rezervasyon başarısız', 'error');
    } finally {
      setBooking(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!token) return;
    try {
      await apiJson(`/resource-booking/cancel/${bookingId}`, {
        method: 'POST',
        token,
      });
      showToast('Rezervasyon iptal edildi', 'success');
      await loadMyBookings();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'İptal başarısız', 'error');
    }
  };

  // Date navigation
  const dates = getNext7Days();

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 60 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={premium.accentBlue}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏟️ {paramClubName || "O'Padel"}</Text>
          <Text style={styles.subtitle}>Kort rezervasyonu yap</Text>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['courts', 'bookings'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setStep(t);
                if (t === 'bookings') loadMyBookings();
              }}
              style={[
                styles.tab,
                step === t ||
                (step === 'slots' && t === 'courts') ||
                (step === 'confirm' && t === 'courts')
                  ? styles.tabActive
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  step === t ||
                  (step === 'slots' && t === 'courts') ||
                  (step === 'confirm' && t === 'courts')
                    ? styles.tabTextActive
                    : null,
                ]}
              >
                {t === 'courts' ? '🎾 Kort Seç' : '📋 Rezervasyonlarım'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Step: Courts */}
        {step === 'courts' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kort Seçin</Text>
            {resources.length === 0 ? (
              <Text style={styles.muted}>Henüz kort tanımlanmamış</Text>
            ) : (
              resources.map((r) => (
                <Pressable key={r.id} style={styles.card} onPress={() => handleSelectCourt(r)}>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardTitle}>{r.name}</Text>
                    <Text style={styles.cardPrice}>{r.price}₺</Text>
                  </View>
                  <Text style={styles.cardSub}>
                    👥 {r.capacity} kişi · ⏱ {r.durationMinutes} dk
                  </Text>
                  {r.description && <Text style={styles.cardDesc}>{r.description}</Text>}
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* Step: Slots */}
        {step === 'slots' && selectedResource && (
          <View style={styles.section}>
            <Pressable onPress={() => setStep('courts')}>
              <Text style={styles.backBtn}>← Kortlara Dön</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>{selectedResource.name} — Saat Seçin</Text>

            {/* Date picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
              {dates.map((d) => (
                <Pressable
                  key={d.value}
                  onPress={() => setSelectedDate(d.value)}
                  style={[styles.dateChip, selectedDate === d.value && styles.dateChipActive]}
                >
                  <Text
                    style={[
                      styles.dateChipDay,
                      selectedDate === d.value && styles.dateChipTextActive,
                    ]}
                  >
                    {d.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dateChipDate,
                      selectedDate === d.value && styles.dateChipTextActive,
                    ]}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Slots grid */}
            {slots.length === 0 ? (
              <Text style={styles.muted}>Bu tarihte müsait slot yok</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((s) => (
                  <Pressable key={s.id} style={styles.slotChip} onPress={() => handleSelectSlot(s)}>
                    <Text style={styles.slotTime}>{s.startTime}</Text>
                    <Text style={styles.slotPrice}>{s.price}₺</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && selectedSlot && selectedResource && (
          <View style={styles.section}>
            <Pressable onPress={() => setStep('slots')}>
              <Text style={styles.backBtn}>← Saatlere Dön</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>Rezervasyon Özeti</Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>🏟️ Kort</Text>
              <Text style={styles.summaryValue}>{selectedResource.name}</Text>
              <Text style={styles.summaryLabel}>📅 Tarih & Saat</Text>
              <Text style={styles.summaryValue}>
                {selectedSlot.date} · {selectedSlot.startTime} - {selectedSlot.endTime}
              </Text>
              <Text style={styles.summaryLabel}>💰 Kort Ücreti</Text>
              <Text style={styles.summaryValue}>{selectedSlot.price}₺</Text>
            </View>

            {/* Participant count */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>👥 Katılımcı Sayısı</Text>
              <TextInput
                style={styles.input}
                value={participantCount}
                onChangeText={setParticipantCount}
                keyboardType="number-pad"
                placeholder="2"
                placeholderTextColor={premium.textMuted}
              />
            </View>

            {/* Addons */}
            {addons.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.inputLabel}>🎾 Ek Hizmetler</Text>
                {addons.map((a) => (
                  <Pressable
                    key={a.id}
                    style={[styles.addonRow, selectedAddons[a.id] ? styles.addonRowActive : null]}
                    onPress={() => toggleAddon(a.id)}
                  >
                    <View>
                      <Text style={styles.addonName}>{a.name}</Text>
                      {a.description && <Text style={styles.addonDesc}>{a.description}</Text>}
                    </View>
                    <Text style={styles.addonPrice}>+{a.price}₺</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Notes */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>📝 Not (opsiyonel)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Özel istek veya not..."
                placeholderTextColor={premium.textMuted}
                multiline
              />
            </View>

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Toplam</Text>
              <Text style={styles.totalValue}>{calculateTotal()}₺</Text>
            </View>

            {/* Book button */}
            <Pressable
              style={[styles.bookBtn, booking && { opacity: 0.5 }]}
              onPress={handleBook}
              disabled={booking}
            >
              <Text style={styles.bookBtnText}>
                {booking ? '⏳ İşleniyor...' : '✅ Rezervasyon Yap'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* My Bookings */}
        {step === 'bookings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rezervasyonlarım</Text>
            {myBookings.length === 0 ? (
              <Text style={styles.muted}>Henüz rezervasyonunuz yok</Text>
            ) : (
              myBookings.map((b) => (
                <View key={b.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardTitle}>{b.resourceName}</Text>
                    <StatusBadge status={b.status} />
                  </View>
                  <Text style={styles.cardSub}>
                    📅 {b.date} · 🕐 {b.startTime}-{b.endTime}
                  </Text>
                  <Text style={styles.cardSub}>
                    💰 {b.totalAmount}₺ · Ödeme: {b.paymentStatus}
                  </Text>
                  {b.status !== 'cancelled' && (
                    <Pressable style={styles.cancelBtn} onPress={() => handleCancelBooking(b.id)}>
                      <Text style={styles.cancelBtnText}>İptal Et</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', label: 'Bekliyor' },
    confirmed: { bg: 'rgba(34,197,94,0.2)', color: '#22c55e', label: 'Onaylı' },
    cancelled: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444', label: 'İptal' },
    completed: { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6', label: 'Tamamlandı' },
  };
  const c = map[status] || map.pending;
  return (
    <View
      style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}
    >
      <Text style={{ color: c.color, fontSize: 11, fontWeight: '700' }}>{c.label}</Text>
    </View>
  );
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getNext7Days() {
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    result.push({
      value: d.toISOString().slice(0, 10),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      dayName: days[d.getDay()],
    });
  }
  return result;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: premium.textMuted, marginTop: 12, fontSize: 14 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: premium.text },
  subtitle: { fontSize: 14, color: premium.textMuted, marginTop: 4 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: premium.glass,
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  tabActive: { backgroundColor: 'rgba(56,189,248,0.12)', borderColor: 'rgba(56,189,248,0.4)' },
  tabText: { fontSize: 13, fontWeight: '700', color: premium.textMuted },
  tabTextActive: { color: premium.accentBlue },
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: premium.text, marginBottom: 12 },
  muted: { color: premium.textMuted, fontSize: 14 },
  card: {
    backgroundColor: premium.glass,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    padding: 16,
    marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: premium.text },
  cardPrice: { fontSize: 16, fontWeight: '800', color: premium.accentBlue },
  cardSub: { fontSize: 13, color: premium.textMuted, marginTop: 4 },
  cardDesc: { fontSize: 12, color: premium.textMuted, marginTop: 6, fontStyle: 'italic' },
  backBtn: { color: premium.accentBlue, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  dateRow: { marginBottom: 16 },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: premium.glass,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginRight: 8,
    alignItems: 'center',
  },
  dateChipActive: { backgroundColor: 'rgba(56,189,248,0.15)', borderColor: premium.accentBlue },
  dateChipDay: { fontSize: 11, fontWeight: '700', color: premium.textMuted },
  dateChipDate: { fontSize: 13, fontWeight: '700', color: premium.text, marginTop: 2 },
  dateChipTextActive: { color: premium.accentBlue },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: premium.glass,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    alignItems: 'center',
    minWidth: 80,
  },
  slotTime: { fontSize: 15, fontWeight: '700', color: premium.text },
  slotPrice: { fontSize: 12, color: premium.accentGreen, marginTop: 2, fontWeight: '600' },
  summaryCard: {
    backgroundColor: premium.glass,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    padding: 16,
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 12, color: premium.textMuted, fontWeight: '600', marginTop: 8 },
  summaryValue: { fontSize: 15, color: premium.text, fontWeight: '700', marginTop: 2 },
  inputRow: { marginTop: 16 },
  inputLabel: { fontSize: 13, color: premium.textMuted, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: premium.text,
    fontSize: 15,
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: premium.glass,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginTop: 8,
  },
  addonRowActive: { borderColor: premium.accentGreen, backgroundColor: 'rgba(52,211,153,0.08)' },
  addonName: { fontSize: 14, fontWeight: '600', color: premium.text },
  addonDesc: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  addonPrice: { fontSize: 14, fontWeight: '700', color: premium.accentGreen },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: premium.glassBorder,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: premium.text },
  totalValue: { fontSize: 22, fontWeight: '800', color: premium.accentBlue },
  bookBtn: {
    marginTop: 20,
    backgroundColor: premium.accentBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignSelf: 'flex-start',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
});
