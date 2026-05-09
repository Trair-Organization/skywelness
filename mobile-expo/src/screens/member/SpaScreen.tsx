import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { EmptyState } from '../../components/premium/EmptyState';
import { showToast } from '../../components/premium/Toast';
import { premium } from '../../theme/premiumTheme';

type SpaServiceRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMinutes: number;
  price: string;
  benefits: string[] | null;
};

type TherapistRow = {
  id: string;
  name: string;
  bio: string | null;
  specialties: string[];
  avgRating: string;
  totalSessions: number;
};

type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  sessionCount: number;
  price: string;
  validityDays: number;
};

type BookingRow = {
  id: string;
  bookingDate: string;
  timeSlot: string;
  status: string;
  service: { name: string };
  therapist: { name: string } | null;
};

const CATEGORIES = [
  { key: 'all', label: 'Tümü', icon: '✨' },
  { key: 'relax', label: 'Relax', icon: '🧘' },
  { key: 'therapy', label: 'Therapy', icon: '💆' },
  { key: 'recovery', label: 'Recovery', icon: '🔄' },
  { key: 'sport', label: 'Sport', icon: '🏋️' },
  { key: 'premium', label: 'Premium', icon: '👑' },
  { key: 'cold', label: 'Cold', icon: '🧊' },
];

const TAB_BAR_PAD = 80;

export function SpaScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();

  const [services, setServices] = useState<SpaServiceRow[]>([]);
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedService, setSelectedService] = useState<SpaServiceRow | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const [svc, ther, pkg, bk] = await Promise.all([
        apiJson<SpaServiceRow[]>('/spa/services', { token, tenantSubdomain: tenant.subdomain }),
        apiJson<TherapistRow[]>('/spa/therapists', { token, tenantSubdomain: tenant.subdomain }),
        apiJson<PackageRow[]>('/spa/packages', { token, tenantSubdomain: tenant.subdomain }),
        apiJson<BookingRow[]>('/spa/bookings', { token, tenantSubdomain: tenant.subdomain }),
      ]);
      setServices(svc);
      setTherapists(ther);
      setPackages(pkg);
      setBookings(bk);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token, tenant]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    showToast('Güncellendi', 'success', 1500);
  };

  const filteredServices =
    selectedCategory === 'all' ? services : services.filter((s) => s.category === selectedCategory);

  const handleBook = async () => {
    if (!selectedService || !token || !tenant) return;
    if (!bookingDate || !bookingTime) {
      showToast('Tarih ve saat seçin', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await apiJson('/spa/bookings', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({
          serviceId: selectedService.id,
          therapistId: selectedTherapist,
          bookingDate,
          timeSlot: bookingTime,
        }),
      });
      showToast('Randevunuz oluşturuldu! Onay bekleniyor.', 'success', 3000);
      setSelectedService(null);
      setSelectedTherapist(null);
      setBookingDate('');
      setBookingTime('');
      await loadData();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Randevu oluşturulamadı', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelBooking = async (id: string) => {
    Alert.alert('İptal', 'Bu randevuyu iptal etmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiJson(`/spa/bookings/${id}`, {
              method: 'DELETE',
              token,
              tenantSubdomain: tenant!.subdomain,
            });
            showToast('Randevu iptal edildi', 'info');
            await loadData();
          } catch {
            showToast('İptal edilemedi', 'error');
          }
        },
      },
    ]);
  };

  if (loading) {
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
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + TAB_BAR_PAD },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={premium.accentBlue}
          />
        }
      >
        <Text style={styles.screenTitle}>🧖 Spa & Wellness</Text>
        <Text style={styles.screenSub}>Premium masaj ve wellness deneyimi</Text>

        {/* ═══ Yaklaşan Randevularım ═══ */}
        {bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed').length > 0 && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Yaklaşan Randevularım</Text>
            {bookings
              .filter((b) => b.status === 'pending' || b.status === 'confirmed')
              .slice(0, 3)
              .map((b) => (
                <View key={b.id} style={styles.bookingRow}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingService}>{b.service.name}</Text>
                    <Text style={styles.bookingMeta}>
                      {b.bookingDate} · {b.timeSlot} {b.therapist ? `· ${b.therapist.name}` : ''}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        b.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending,
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {b.status === 'confirmed' ? '✓ Onaylı' : '⏳ Onay Bekliyor'}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => cancelBooking(b.id)} hitSlop={8}>
                    <Text style={styles.cancelBtn}>✕</Text>
                  </Pressable>
                </View>
              ))}
          </GlassCard>
        )}

        {/* ═══ Kategori Filtreleme ═══ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[styles.catChip, selectedCategory === cat.key && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text
                style={[styles.catLabel, selectedCategory === cat.key && styles.catLabelActive]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ═══ Hizmet Kataloğu ═══ */}
        <Text style={styles.sectionTitle}>💆 Hizmetler</Text>
        {filteredServices.length === 0 ? (
          <EmptyState icon="🧖" title="Bu kategoride hizmet yok" />
        ) : (
          filteredServices.map((svc) => (
            <Pressable
              key={svc.id}
              style={({ pressed }) => [
                styles.serviceCard,
                pressed && styles.serviceCardPressed,
                selectedService?.id === svc.id && styles.serviceCardSelected,
              ]}
              onPress={() => setSelectedService(selectedService?.id === svc.id ? null : svc)}
            >
              <View style={styles.serviceHeader}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{svc.name}</Text>
                  <Text style={styles.serviceMeta}>
                    {svc.durationMinutes} dk · {svc.category}
                  </Text>
                </View>
                <Text style={styles.servicePrice}>₺{svc.price}</Text>
              </View>
              {selectedService?.id === svc.id && (
                <View style={styles.serviceExpanded}>
                  {svc.description && <Text style={styles.serviceDesc}>{svc.description}</Text>}
                  {svc.benefits && svc.benefits.length > 0 && (
                    <View style={styles.benefitsRow}>
                      {svc.benefits.map((b) => (
                        <View key={b} style={styles.benefitChip}>
                          <Text style={styles.benefitText}>{b}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          ))
        )}

        {/* ═══ Masözler ═══ */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>🙌 Terapistler</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.therapistScroll}
        >
          {therapists.map((th) => (
            <Pressable
              key={th.id}
              style={[
                styles.therapistCard,
                selectedTherapist === th.id && styles.therapistCardSelected,
              ]}
              onPress={() => setSelectedTherapist(selectedTherapist === th.id ? null : th.id)}
            >
              <View style={styles.therapistAvatar}>
                <Text style={styles.therapistInitials}>{th.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.therapistName}>{th.name}</Text>
              <Text style={styles.therapistRating}>★ {th.avgRating}</Text>
              <Text style={styles.therapistSpec} numberOfLines={2}>
                {th.specialties.slice(0, 2).join(', ')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ═══ Randevu Oluştur ═══ */}
        {selectedService && (
          <GlassCard style={styles.bookingSection}>
            <Text style={styles.sectionTitle}>📋 Randevu Oluştur</Text>
            <Text style={styles.bookingLabel}>
              Seçili hizmet: <Text style={styles.bookingValue}>{selectedService.name}</Text>
            </Text>
            {selectedTherapist && (
              <Text style={styles.bookingLabel}>
                Terapist:{' '}
                <Text style={styles.bookingValue}>
                  {therapists.find((t) => t.id === selectedTherapist)?.name}
                </Text>
              </Text>
            )}
            <View style={styles.dateTimeRow}>
              <Pressable
                style={styles.dateBtn}
                onPress={() => {
                  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
                  setBookingDate(tomorrow);
                }}
              >
                <Text style={styles.dateBtnTxt}>{bookingDate || 'Tarih Seç'}</Text>
              </Pressable>
              <Pressable style={styles.dateBtn} onPress={() => setBookingTime('14:00')}>
                <Text style={styles.dateBtnTxt}>{bookingTime || 'Saat Seç'}</Text>
              </Pressable>
            </View>
            <View style={styles.timeSlots}>
              {[
                '10:00',
                '11:00',
                '12:00',
                '14:00',
                '15:00',
                '16:00',
                '17:00',
                '18:00',
                '19:00',
              ].map((t) => (
                <Pressable
                  key={t}
                  style={[styles.timeChip, bookingTime === t && styles.timeChipActive]}
                  onPress={() => setBookingTime(t)}
                >
                  <Text style={[styles.timeChipTxt, bookingTime === t && styles.timeChipTxtActive]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.bookBtn,
                pressed && styles.bookBtnPressed,
                submitting && styles.bookBtnDisabled,
              ]}
              onPress={handleBook}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={premium.accentBlue} />
              ) : (
                <Text style={styles.bookBtnTxt}>Randevu Oluştur</Text>
              )}
            </Pressable>
          </GlassCard>
        )}

        {/* ═══ Paketler ═══ */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>📦 Masaj Paketleri</Text>
        {packages.map((pkg) => (
          <GlassCard key={pkg.id} style={styles.packageCard}>
            <View style={styles.packageHeader}>
              <Text style={styles.packageName}>{pkg.name}</Text>
              <Text style={styles.packagePrice}>₺{pkg.price}</Text>
            </View>
            <Text style={styles.packageDesc}>{pkg.description}</Text>
            <Text style={styles.packageMeta}>
              {pkg.sessionCount} seans · {pkg.validityDays} gün geçerli
            </Text>
          </GlassCard>
        ))}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 24, fontWeight: '800', color: premium.text, marginBottom: 4 },
  screenSub: { fontSize: 14, color: premium.textMuted, marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: premium.text, marginBottom: 12 },
  // Bookings
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  bookingInfo: { flex: 1 },
  bookingService: { color: premium.text, fontSize: 14, fontWeight: '700' },
  bookingMeta: { color: premium.textMuted, fontSize: 12, marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  statusConfirmed: { backgroundColor: 'rgba(52,211,153,0.15)' },
  statusPending: { backgroundColor: 'rgba(251,191,36,0.15)' },
  statusText: { fontSize: 11, fontWeight: '700', color: premium.text },
  cancelBtn: { color: premium.danger, fontSize: 18, fontWeight: '700' },
  // Categories
  catScroll: { gap: 8, paddingBottom: 16 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  catChipActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.1)' },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: 13, fontWeight: '700', color: premium.textMuted },
  catLabelActive: { color: premium.accentBlue },
  // Services
  serviceCard: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusMd,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 14,
    marginBottom: 8,
  },
  serviceCardPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  serviceCardSelected: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.06)',
  },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceInfo: { flex: 1 },
  serviceName: { color: premium.text, fontSize: 15, fontWeight: '700' },
  serviceMeta: { color: premium.textMuted, fontSize: 12, marginTop: 2 },
  servicePrice: { color: '#fbbf24', fontSize: 16, fontWeight: '800' },
  serviceExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premium.glassBorder,
  },
  serviceDesc: { color: premium.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  benefitChip: {
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  benefitText: { color: premium.accentGreen, fontSize: 11, fontWeight: '600' },
  // Therapists
  therapistScroll: { gap: 10, paddingBottom: 16 },
  therapistCard: {
    width: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  therapistCardSelected: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  therapistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  therapistInitials: { color: premium.accentBlue, fontSize: 14, fontWeight: '800' },
  therapistName: { color: premium.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  therapistRating: { color: '#fbbf24', fontSize: 11, fontWeight: '700', marginTop: 2 },
  therapistSpec: { color: premium.textMuted, fontSize: 10, textAlign: 'center', marginTop: 2 },
  // Booking form
  bookingSection: { marginTop: 16 },
  bookingLabel: { color: premium.textMuted, fontSize: 13, marginBottom: 6 },
  bookingValue: { color: premium.text, fontWeight: '700' },
  dateTimeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dateBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dateBtnTxt: { color: premium.text, fontSize: 14, fontWeight: '600' },
  timeSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  timeChip: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  timeChipActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.15)' },
  timeChipTxt: { color: premium.textMuted, fontSize: 13, fontWeight: '600' },
  timeChipTxtActive: { color: premium.accentBlue },
  bookBtn: {
    borderWidth: 1,
    borderColor: premium.accentBlue,
    borderRadius: premium.radiusSm,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.1)',
  },
  bookBtnPressed: { backgroundColor: 'rgba(56,189,248,0.25)' },
  bookBtnDisabled: { opacity: 0.5 },
  bookBtnTxt: { color: premium.accentBlue, fontSize: 16, fontWeight: '800' },
  // Packages
  packageCard: { marginBottom: 10 },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  packageName: { color: premium.text, fontSize: 15, fontWeight: '700', flex: 1 },
  packagePrice: { color: '#fbbf24', fontSize: 16, fontWeight: '800' },
  packageDesc: { color: premium.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  packageMeta: { color: premium.textMuted, fontSize: 12, fontWeight: '600' },
});
