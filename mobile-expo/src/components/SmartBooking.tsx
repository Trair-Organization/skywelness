import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiJson } from '../api/client';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { showToast } from '../components/premium/Toast';
import { premium } from '../theme/premiumTheme';

type V2Service = {
  id: string;
  name: string;
  category: string;
  providerType: string;
  providerId: string | null;
  providerName: string | null;
  durationMinutes: number;
  price: string;
  currency: string;
  capacity: number;
};

type V2Slot = {
  id: string;
  serviceId: string;
  providerType: string;
  providerId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  remainingCapacity: number;
  price: string;
  currency: string;
};

type Props = {
  subdomain: string;
  category?: string; // 'court_rental' | 'personal_training' | 'massage' | undefined (all)
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

export function SmartBooking({ subdomain, category }: Props) {
  const { token, tenant } = useMemberAuth();
  const [services, setServices] = useState<V2Service[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [allSlots, setAllSlots] = useState<V2Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const days = getWeekDays();

  // Hizmetleri yükle
  useEffect(() => {
    const q = category ? `&category=${category}` : '';
    apiJson<V2Service[]>(`/v2/services?tenant=${encodeURIComponent(subdomain)}${q}`, { auth: false })
      .then(setServices)
      .catch(() => setServices([]));
  }, [subdomain, category]);

  // Slotları yükle (tüm hizmetler için)
  const loadSlots = useCallback(async () => {
    if (services.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        services.map((svc) =>
          apiJson<V2Slot[]>(`/v2/schedule?tenant=${encodeURIComponent(subdomain)}&serviceId=${svc.id}&date=${selectedDate}`, { auth: false })
            .catch(() => [] as V2Slot[])
        )
      );
      setAllSlots(results.flat());
    } finally { setLoading(false); }
  }, [services, subdomain, selectedDate]);

  useEffect(() => { void loadSlots(); }, [loadSlots]);

  // Önerilen slotlar (en yakın 3 müsait)
  const now = new Date();
  const currentHour = now.getHours();
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const availableSlots = allSlots
    .filter(s => s.remainingCapacity > 0)
    .filter(s => !isToday || parseInt(s.startTime) > currentHour)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const recommended = availableSlots.slice(0, 3);

  // Grid: service × saat
  const hours = Array.from({ length: 17 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

  async function handleBook(slotId: string) {
    if (!token) {
      showToast('Rezervasyon için giriş yapmalısınız', 'warning');
      return;
    }
    setBooking(true);
    try {
      await apiJson('/v2/appointments', {
        method: 'POST',
        token,
        tenantSubdomain: tenant?.subdomain,
        body: JSON.stringify({ slotId }),
      });
      showToast('Rezervasyon oluşturuldu! ✅', 'success');
      void loadSlots();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Rezervasyon başarısız', 'error');
    } finally { setBooking(false); }
  }

  if (services.length === 0) return null;

  const getSlotForServiceHour = (serviceId: string, hour: string): V2Slot | undefined => {
    return allSlots.find(s => s.serviceId === serviceId && s.startTime === hour);
  };

  const getServiceName = (serviceId: string): string => {
    const svc = services.find(s => s.id === serviceId);
    return svc?.providerName || svc?.name || '';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>📅 Rezervasyon</Text>

      {/* Tarih Seçimi */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
        {days.map((d) => (
          <Pressable
            key={d.value}
            onPress={() => setSelectedDate(d.value)}
            style={[styles.dateChip, selectedDate === d.value && styles.dateChipActive]}
          >
            <Text style={[styles.dateDay, selectedDate === d.value && styles.dateTxtActive]}>{d.dayName}</Text>
            <Text style={[styles.dateNum, selectedDate === d.value && styles.dateTxtActive]}>{d.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <Text style={styles.loadingTxt}>Yükleniyor...</Text>
      ) : (
        <>
          {/* ⚡ Önerilen Saatler */}
          {recommended.length > 0 && (
            <View style={styles.recommendedSection}>
              <Text style={styles.recommendedTitle}>⚡ Önerilen Saatler</Text>
              {recommended.map((slot) => (
                <Pressable
                  key={slot.id}
                  style={styles.recommendedCard}
                  onPress={() => handleBook(slot.id)}
                  disabled={booking}
                >
                  <View style={styles.recommendedLeft}>
                    <Text style={styles.recommendedTime}>{slot.startTime} - {slot.endTime}</Text>
                    <Text style={styles.recommendedName}>{getServiceName(slot.serviceId)}</Text>
                  </View>
                  <View style={styles.recommendedRight}>
                    <Text style={styles.recommendedPrice}>{slot.price}₺</Text>
                    {token && <Text style={styles.recommendedCta}>Hemen Al →</Text>}
                  </View>
                </Pressable>
              ))}
              {!token && <Text style={styles.loginHint}>Rezervasyon için giriş yapın</Text>}
            </View>
          )}

          {/* 📊 Grid: Tüm Hizmetler × Saatler */}
          <View style={styles.gridSection}>
            <Text style={styles.gridTitle}>📊 Tüm Saatler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header: Saatler */}
                <View style={styles.gridRow}>
                  <View style={styles.gridLabelCell} />
                  {hours.map((h) => (
                    <View key={h} style={styles.gridHeaderCell}>
                      <Text style={styles.gridHeaderTxt}>{h.slice(0, 2)}</Text>
                    </View>
                  ))}
                </View>
                {/* Rows: Her hizmet */}
                {services.map((svc) => (
                  <View key={svc.id} style={styles.gridRow}>
                    <View style={styles.gridLabelCell}>
                      <Text style={styles.gridLabelTxt} numberOfLines={1}>
                        {svc.providerName || svc.name.split(' - ')[0]}
                      </Text>
                    </View>
                    {hours.map((h) => {
                      const slot = getSlotForServiceHour(svc.id, h);
                      const available = slot && slot.remainingCapacity > 0;
                      const past = isToday && parseInt(h) <= currentHour;
                      return (
                        <Pressable
                          key={h}
                          style={[
                            styles.gridCell,
                            available && !past && styles.gridCellAvailable,
                            !available && styles.gridCellBooked,
                            past && styles.gridCellPast,
                          ]}
                          onPress={() => {
                            if (available && !past && slot) handleBook(slot.id);
                          }}
                          disabled={!available || past || booking}
                        >
                          <Text style={[
                            styles.gridCellTxt,
                            available && !past && styles.gridCellTxtAvailable,
                          ]}>
                            {past ? '·' : available ? '✓' : '✗'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {availableSlots.length === 0 && (
            <Text style={styles.noSlots}>Bu tarihte müsait saat yok</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: premium.text, marginBottom: 12, paddingHorizontal: 20 },
  dateRow: { marginBottom: 16, paddingHorizontal: 16 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: 'rgba(0,0,0,0.2)', marginRight: 8, alignItems: 'center' },
  dateChipActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.15)' },
  dateDay: { fontSize: 11, color: premium.textMuted, fontWeight: '600' },
  dateNum: { fontSize: 14, color: premium.text, fontWeight: '800', marginTop: 2 },
  dateTxtActive: { color: premium.accentBlue },
  loadingTxt: { color: premium.textMuted, textAlign: 'center', padding: 20 },
  // Recommended
  recommendedSection: { paddingHorizontal: 20, marginBottom: 20 },
  recommendedTitle: { fontSize: 14, fontWeight: '800', color: premium.accentBlue, marginBottom: 10 },
  recommendedCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.06)', marginBottom: 8 },
  recommendedLeft: {},
  recommendedTime: { fontSize: 16, fontWeight: '800', color: premium.text },
  recommendedName: { fontSize: 12, color: premium.textMuted, marginTop: 2 },
  recommendedRight: { alignItems: 'flex-end' },
  recommendedPrice: { fontSize: 16, fontWeight: '900', color: premium.accentGreen },
  recommendedCta: { fontSize: 11, color: premium.accentGreen, fontWeight: '700', marginTop: 2 },
  loginHint: { color: premium.textMuted, fontSize: 12, marginTop: 4 },
  // Grid
  gridSection: { marginBottom: 16 },
  gridTitle: { fontSize: 14, fontWeight: '800', color: premium.text, marginBottom: 10, paddingHorizontal: 20 },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  gridLabelCell: { width: 80, paddingHorizontal: 8, paddingVertical: 6 },
  gridLabelTxt: { fontSize: 11, color: premium.textMuted, fontWeight: '600' },
  gridHeaderCell: { width: 36, alignItems: 'center', paddingVertical: 4 },
  gridHeaderTxt: { fontSize: 10, color: premium.textMuted, fontWeight: '700' },
  gridCell: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6, margin: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  gridCellAvailable: { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)' },
  gridCellBooked: { backgroundColor: 'rgba(100,116,139,0.15)' },
  gridCellPast: { backgroundColor: 'rgba(0,0,0,0.1)' },
  gridCellTxt: { fontSize: 10, color: premium.textMuted, fontWeight: '700' },
  gridCellTxtAvailable: { color: '#10b981' },
  noSlots: { color: premium.textMuted, textAlign: 'center', padding: 16, fontSize: 13 },
});
