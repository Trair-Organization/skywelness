import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { SmartBooking } from '../../components/SmartBooking';
import { showToast } from '../../components/premium/Toast';
import { premium } from '../../theme/premiumTheme';

type CapacityOption = { label: string; value: number; icon: string; desc: string };

const CAPACITY_OPTIONS: CapacityOption[] = [
  { label: 'Tek Kişilik', value: 1, icon: '🧖', desc: 'Bireysel masaj seansı' },
  { label: 'Çift Kişilik', value: 2, icon: '🧖‍♀️🧖‍♂️', desc: 'Çiftler için masaj seansı' },
];

type CouplesSlot = {
  startTime: string;
  endTime: string;
  therapists: Array<{ id: string; name: string; slotId: string }>;
  totalPrice: number;
  currency: string;
};

const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
function getWeekDays() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      value: d.toISOString().slice(0, 10),
      dayName: DAYS[d.getDay()],
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      isToday: i === 0,
    });
  }
  return days;
}

export function SpaScreen() {
  const insets = useSafeAreaInsets();
  const { token, tenant, user } = useMemberAuth();
  const [selectedCapacity, setSelectedCapacity] = useState<number | null>(null);

  // Çift kişilik state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [couplesSlots, setCouplesSlots] = useState<CouplesSlot[]>([]);
  const [loadingCouples, setLoadingCouples] = useState(false);
  const [bookingCouples, setBookingCouples] = useState(false);
  const days = getWeekDays();

  const loadCouplesSlots = useCallback(async () => {
    if (!tenant || selectedCapacity !== 2) return;
    setLoadingCouples(true);
    try {
      const data = await apiJson<CouplesSlot[]>(
        `/v2/schedule/couples?tenant=${encodeURIComponent(tenant.subdomain)}&date=${selectedDate}`,
        { auth: false },
      );
      setCouplesSlots(data);
    } catch {
      setCouplesSlots([]);
    } finally {
      setLoadingCouples(false);
    }
  }, [tenant, selectedCapacity, selectedDate]);

  useEffect(() => {
    if (selectedCapacity === 2) {
      loadCouplesSlots();
    }
  }, [selectedCapacity, selectedDate, loadCouplesSlots]);

  const handleCouplesBook = async (slot: CouplesSlot) => {
    if (!token || !tenant || !user) {
      showToast('Giriş yapmalısınız', 'warning');
      return;
    }
    setBookingCouples(true);
    try {
      // İlk masözün slot'u ile checkout oluştur (2 kişilik fiyat backend'de hesaplanır)
      const res = await apiJson<{ checkoutUrl: string }>('/v2/checkout', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({
          slotId: slot.therapists[0].slotId,
          guestEmail: user.email,
          guestName: `${user.firstName} ${user.lastName}`.trim(),
          guestPhone: user.phone || undefined,
        }),
      });
      if (res.checkoutUrl) {
        const result = await WebBrowser.openAuthSessionAsync(
          res.checkoutUrl,
          'wellnessclubai://booking-success',
        );
        if (result.type === 'success') {
          showToast('Çift masaj rezervasyonu onaylandı! 🎉', 'success');
          void loadCouplesSlots();
        } else if (result.type === 'cancel') {
          showToast('Ödeme iptal edildi', 'warning');
        }
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Rezervasyon başarısız', 'error');
    } finally {
      setBookingCouples(false);
    }
  };

  if (!tenant) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 60 }]}>
          <Text style={styles.emptyTxt}>Kulüp bilgisi yüklenemedi</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>💆 Spa & Masaj</Text>
          <Text style={styles.subtitle}>Masöz seç, saat seç, rahatla.</Text>
        </View>

        {/* Kapasite Seçimi */}
        <View style={styles.capacitySection}>
          <Text style={styles.sectionTitle}>Seans Tipi Seçin</Text>
          <View style={styles.capacityRow}>
            {CAPACITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.capacityCard,
                  selectedCapacity === opt.value && styles.capacityCardActive,
                ]}
                onPress={() => setSelectedCapacity(opt.value)}
              >
                <Text style={styles.capacityIcon}>{opt.icon}</Text>
                <Text
                  style={[
                    styles.capacityLabel,
                    selectedCapacity === opt.value && styles.capacityLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.capacityDesc}>{opt.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tek Kişilik → SmartBooking */}
        {selectedCapacity === 1 && (
          <SmartBooking subdomain={tenant.subdomain} category="massage" participantCount={1} />
        )}

        {/* Çift Kişilik → Couples UI */}
        {selectedCapacity === 2 && (
          <View style={styles.couplesSection}>
            {/* Tarih Seçimi */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
              {days.map((d) => (
                <Pressable
                  key={d.value}
                  onPress={() => setSelectedDate(d.value)}
                  style={[styles.dateChip, selectedDate === d.value && styles.dateChipActive]}
                >
                  <Text style={[styles.dateDay, selectedDate === d.value && styles.dateTxtActive]}>
                    {d.dayName}
                  </Text>
                  <Text style={[styles.dateNum, selectedDate === d.value && styles.dateTxtActive]}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.couplesTitle}>🧖‍♀️🧖‍♂️ Çift Masaj Müsaitliği</Text>
            <Text style={styles.couplesSubtitle}>
              Aynı saatte 2 masöz müsait olan seanslar
            </Text>

            {loadingCouples ? (
              <ActivityIndicator color={premium.accentBlue} style={{ marginTop: 20 }} />
            ) : couplesSlots.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>😔</Text>
                <Text style={styles.emptyText}>
                  Bu tarihte çift kişilik müsait seans bulunamadı.
                </Text>
              </View>
            ) : (
              <View style={styles.couplesList}>
                {couplesSlots.map((slot) => (
                  <Pressable
                    key={slot.startTime}
                    style={({ pressed }) => [
                      styles.couplesCard,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => handleCouplesBook(slot)}
                    disabled={bookingCouples}
                  >
                    <View style={styles.couplesCardLeft}>
                      <Text style={styles.couplesTime}>
                        {slot.startTime} - {slot.endTime}
                      </Text>
                      <Text style={styles.couplesTherapists}>
                        {slot.therapists.map((t) => t.name).join(' + ')}
                      </Text>
                    </View>
                    <View style={styles.couplesCardRight}>
                      <Text style={styles.couplesPrice}>
                        {slot.totalPrice.toLocaleString('tr-TR')}₺
                      </Text>
                      <Text style={styles.couplesCta}>Rezerve Et →</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {!selectedCapacity && (
          <View style={styles.hintBox}>
            <Text style={styles.hintIcon}>☝️</Text>
            <Text style={styles.hintText}>
              Yukarıdan seans tipini seçerek müsait masözleri ve saatleri görüntüleyin.
            </Text>
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: premium.textMuted, fontSize: 14 },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: premium.text },
  subtitle: { fontSize: 14, color: premium.textMuted, marginTop: 4 },
  capacitySection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: premium.text, marginBottom: 12 },
  capacityRow: { flexDirection: 'row', gap: 12 },
  capacityCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    gap: 6,
  },
  capacityCardActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.1)' },
  capacityIcon: { fontSize: 28 },
  capacityLabel: { fontSize: 14, fontWeight: '800', color: premium.text },
  capacityLabelActive: { color: premium.accentBlue },
  capacityDesc: { fontSize: 11, color: premium.textMuted, textAlign: 'center' },
  hintBox: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(56,189,248,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
    alignItems: 'center',
    gap: 8,
  },
  hintIcon: { fontSize: 28 },
  hintText: { fontSize: 13, color: premium.textMuted, textAlign: 'center', lineHeight: 20 },
  // Couples
  couplesSection: { paddingHorizontal: 20 },
  dateRow: { marginBottom: 16 },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginRight: 8,
    alignItems: 'center',
  },
  dateChipActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.15)' },
  dateDay: { fontSize: 11, color: premium.textMuted, fontWeight: '600' },
  dateNum: { fontSize: 14, color: premium.text, fontWeight: '800', marginTop: 2 },
  dateTxtActive: { color: premium.accentBlue },
  couplesTitle: { fontSize: 16, fontWeight: '800', color: premium.text, marginBottom: 4 },
  couplesSubtitle: { fontSize: 12, color: premium.textMuted, marginBottom: 16 },
  emptyBox: { alignItems: 'center', padding: 24, gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 13, color: premium.textMuted, textAlign: 'center' },
  couplesList: { gap: 10 },
  couplesCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    backgroundColor: 'rgba(16,185,129,0.06)',
  },
  couplesCardLeft: {},
  couplesTime: { fontSize: 18, fontWeight: '800', color: premium.text },
  couplesTherapists: { fontSize: 13, color: premium.textMuted, marginTop: 4 },
  couplesCardRight: { alignItems: 'flex-end' },
  couplesPrice: { fontSize: 18, fontWeight: '900', color: premium.accentGreen },
  couplesCta: { fontSize: 12, color: premium.accentGreen, fontWeight: '700', marginTop: 2 },
});
