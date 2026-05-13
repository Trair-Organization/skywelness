import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { showToast } from '../../components/premium/Toast';
import { premium } from '../../theme/premiumTheme';
import type { MemberTabParamList } from '../../navigation/memberTabTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_HEIGHT = 220;

type ProfileData = {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  location: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  galleryImages: string[];
  services: string[];
  vertical: string;
  visibilityMode: 'public' | 'private';
  phone: string | null;
  email: string | null;
  website: string | null;
  avgRating: string;
  reviewCount: number;
  priceRange: string | null;
  profileType: 'club' | 'trainer' | 'other';
  trainers: Array<{
    id: string;
    name: string;
    photoUrl: string | null;
    specializations: string[];
    avgRating: string;
    totalSessions: number;
    bio: string | null;
  }>;
  resources: Array<{
    id: string;
    name: string;
    resourceType: string;
    capacity: number;
    durationMinutes: number;
    price: string;
    currency: string;
    description: string | null;
    imageUrl: string | null;
  }>;
  metrics: {
    memberCount: number;
    totalBookings: number;
    completedBookings: number;
    trainerCount: number;
  };
};

type SlotData = {
  id: string;
  resourceId: string;
  resourceName: string;
  startTime: string;
  endTime: string;
  price: string;
};

export function PartnerProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MemberTabParamList, 'PartnerProfile'>>();
  const { token, tenant } = useMemberAuth();
  const subdomain = route.params?.subdomain ?? '';
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const sliderIndex = useRef(new Animated.Value(0)).current;

  const loadProfile = useCallback(async () => {
    if (!subdomain) return;
    try {
      const data = await apiJson<ProfileData>(
        `/tenants/${encodeURIComponent(subdomain)}/profile`,
        { auth: false },
      );
      setProfile(data);
      if (data.resources.length > 0 && !selectedResource) {
        setSelectedResource(data.resources[0].id);
      }
    } catch {
      showToast('Profil yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  }, [subdomain, selectedResource]);

  const loadSlots = useCallback(async () => {
    if (!subdomain || !token) return;
    try {
      const res = await apiJson<{ date: string; slots: SlotData[] }>(
        `/tenants/${encodeURIComponent(subdomain)}/profile/slots?date=${selectedDate}${selectedResource ? `&resourceId=${selectedResource}` : ''}`,
        { token, tenantSubdomain: tenant?.subdomain },
      );
      setSlots(res.slots);
    } catch {
      setSlots([]);
    }
  }, [subdomain, selectedDate, selectedResource, token, tenant?.subdomain]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile && token) loadSlots();
  }, [profile, selectedDate, selectedResource, loadSlots, token]);

  // Slider animation
  useEffect(() => {
    const images = profile?.galleryImages ?? [];
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      sliderIndex.setValue(0);
      Animated.timing(sliderIndex, {
        toValue: 1,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start();
    }, 4000);
    return () => clearInterval(interval);
  }, [profile?.galleryImages, sliderIndex]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    if (token) await loadSlots();
    setRefreshing(false);
  };

  const handleBookSlot = async (slotId: string) => {
    if (!token || !subdomain) {
      showToast('Rezervasyon için giriş yapmalısınız', 'warning');
      return;
    }
    try {
      await apiJson(`/resource-booking/book?tenant=${encodeURIComponent(subdomain)}`, {
        method: 'POST',
        token,
        tenantSubdomain: tenant?.subdomain,
        body: JSON.stringify({ resourceSlotId: slotId }),
      });
      showToast('Rezervasyon oluşturuldu! ✅', 'success');
      await loadSlots();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Rezervasyon başarısız', 'error');
    }
  };

  const dates = getNext7Days();

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 80 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
        </View>
      </GradientBackground>
    );
  }

  if (!profile) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 80 }]}>
          <Text style={styles.errorText}>Profil bulunamadı</Text>
        </View>
      </GradientBackground>
    );
  }

  const sliderImages = profile.galleryImages.length > 0
    ? profile.galleryImages
    : profile.coverImageUrl
      ? [profile.coverImageUrl]
      : [];

  return (
    <GradientBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={premium.accentBlue} />}
      >
        {/* Back button */}
        <Pressable
          style={[styles.backBtn, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnTxt}>← Geri</Text>
        </Pressable>

        {/* ═══ Slider / Galeri ═══ */}
        <View style={styles.sliderContainer}>
          {sliderImages.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.slider}
            >
              {sliderImages.map((img, i) => (
                <Image key={i} source={{ uri: img }} style={styles.sliderImage} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.sliderPlaceholder}>
              <Text style={{ fontSize: 48 }}>
                {profile.vertical === 'padel' ? '🎾' : profile.profileType === 'trainer' ? '🏋️' : '🏢'}
              </Text>
            </View>
          )}
          {/* Gradient overlay */}
          <View style={styles.sliderGradient} />
        </View>

        {/* ═══ Header: Logo + İsim + Rating ═══ */}
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            {profile.logoUrl && (
              <Image source={{ uri: profile.logoUrl }} style={styles.headerLogo} resizeMode="contain" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName}>{profile.name}</Text>
              {profile.location && (
                <Text style={styles.headerLocation}>📍 {profile.location}</Text>
              )}
            </View>
            {profile.avgRating !== '0.00' && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingTxt}>★ {profile.avgRating}</Text>
              </View>
            )}
          </View>
          {/* Metrics */}
          <View style={styles.metricsRow}>
            {profile.metrics.memberCount > 0 && (
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{profile.metrics.memberCount}</Text>
                <Text style={styles.metricLabel}>Üye</Text>
              </View>
            )}
            {profile.metrics.totalBookings > 0 && (
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{profile.metrics.totalBookings}</Text>
                <Text style={styles.metricLabel}>Rezervasyon</Text>
              </View>
            )}
            {profile.metrics.trainerCount > 0 && (
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{profile.metrics.trainerCount}</Text>
                <Text style={styles.metricLabel}>Eğitmen</Text>
              </View>
            )}
          </View>
        </View>

        {/* ═══ Hakkımızda ═══ */}
        {profile.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Hakkımızda</Text>
            <Text style={styles.descriptionText}>{profile.description}</Text>
          </View>
        )}

        {/* ═══ Uzmanlık Alanları / Servisler ═══ */}
        {profile.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Hizmetler</Text>
            <View style={styles.servicesGrid}>
              {profile.services.map((s, i) => (
                <View key={i} style={styles.serviceChip}>
                  <Text style={styles.serviceChipTxt}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═══ Kaynaklar & Fiyatlar ═══ */}
        {profile.resources.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛍️ Ürün & Hizmetler</Text>
            {profile.resources.map((r) => (
              <Pressable
                key={r.id}
                style={[
                  styles.resourceCard,
                  selectedResource === r.id && styles.resourceCardActive,
                ]}
                onPress={() => setSelectedResource(r.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.resourceName}>{r.name}</Text>
                  <Text style={styles.resourceMeta}>
                    👥 {r.capacity} kişi · ⏱ {r.durationMinutes} dk
                  </Text>
                  {r.description && (
                    <Text style={styles.resourceDesc} numberOfLines={2}>{r.description}</Text>
                  )}
                </View>
                <Text style={styles.resourcePrice}>{r.price}₺</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ═══ Ajanda / Takvim ═══ */}
        {profile.resources.length > 0 && token && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Müsait Saatler</Text>
            {/* Date picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
              {dates.map((d) => (
                <Pressable
                  key={d.value}
                  onPress={() => setSelectedDate(d.value)}
                  style={[styles.dateChip, selectedDate === d.value && styles.dateChipActive]}
                >
                  <Text style={[styles.dateChipDay, selectedDate === d.value && styles.dateChipTxtActive]}>{d.dayName}</Text>
                  <Text style={[styles.dateChipDate, selectedDate === d.value && styles.dateChipTxtActive]}>{d.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {/* Slots */}
            {slots.length === 0 ? (
              <Text style={styles.noSlots}>Bu tarihte müsait slot yok</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((s) => (
                  <Pressable key={s.id} style={styles.slotChip} onPress={() => handleBookSlot(s.id)}>
                    <Text style={styles.slotTime}>{s.startTime}</Text>
                    <Text style={styles.slotPrice}>{s.price}₺</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ═══ Eğitmenler ═══ */}
        {profile.trainers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Eğitmenler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile.trainers.map((t) => (
                <View key={t.id} style={styles.trainerMiniCard}>
                  <View style={styles.trainerMiniPhoto}>
                    {t.photoUrl ? (
                      <Image source={{ uri: t.photoUrl }} style={styles.trainerMiniImg} resizeMode="cover" />
                    ) : (
                      <Text style={styles.trainerMiniInitials}>
                        {t.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.trainerMiniName} numberOfLines={1}>{t.name}</Text>
                  <Text style={styles.trainerMiniSpec} numberOfLines={1}>
                    {t.specializations.slice(0, 2).join(' · ')}
                  </Text>
                  {t.avgRating !== '0.00' && (
                    <Text style={styles.trainerMiniRating}>★ {t.avgRating}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ═══ İletişim ═══ */}
        {(profile.phone || profile.email) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 İletişim</Text>
            {profile.phone && <Text style={styles.contactText}>📞 {profile.phone}</Text>}
            {profile.email && <Text style={styles.contactText}>✉️ {profile.email}</Text>}
            {profile.website && <Text style={styles.contactText}>🌐 {profile.website}</Text>}
          </View>
        )}
      </ScrollView>

      {/* ═══ Sticky CTA ═══ */}
      <View style={[styles.stickyCta, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={styles.stickyCtaBtn}
          onPress={() => {
            if (!token) {
              showToast('Giriş yapmalısınız', 'warning');
              return;
            }
            if (profile.visibilityMode === 'public' && profile.resources.length > 0) {
              // Scroll to ajanda section
              showToast('Yukarıdan saat seçip rezervasyon yapabilirsiniz', 'info');
            } else {
              showToast('Kulüple iletişime geçin', 'info');
            }
          }}
        >
          <Text style={styles.stickyCtaBtnTxt}>
            {profile.visibilityMode === 'public' ? '🎾 Rezervasyon Yap' : '📨 İletişime Geç'}
          </Text>
        </Pressable>
      </View>
    </GradientBackground>
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
  errorText: { color: premium.textMuted, fontSize: 16 },
  backBtn: { position: 'absolute', left: 16, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  backBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Slider
  sliderContainer: { width: '100%', height: SLIDER_HEIGHT, position: 'relative' },
  slider: { width: '100%', height: SLIDER_HEIGHT },
  sliderImage: { width: SCREEN_WIDTH, height: SLIDER_HEIGHT },
  sliderPlaceholder: { width: '100%', height: SLIDER_HEIGHT, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' },
  sliderGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'transparent' },
  // Header
  headerSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 48, height: 48, borderRadius: 12 },
  headerName: { fontSize: 22, fontWeight: '900', color: premium.text },
  headerLocation: { fontSize: 13, color: premium.textMuted, marginTop: 2 },
  ratingBadge: { backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  ratingTxt: { color: '#fbbf24', fontSize: 14, fontWeight: '900' },
  metricsRow: { flexDirection: 'row', gap: 20, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: premium.glassBorder },
  metricItem: { alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '900', color: premium.text },
  metricLabel: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  // Sections
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: premium.text, marginBottom: 12 },
  descriptionText: { fontSize: 14, color: premium.textMuted, lineHeight: 22 },
  // Services
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: premium.glass, borderWidth: 1, borderColor: premium.glassBorder },
  serviceChipTxt: { color: premium.text, fontSize: 12, fontWeight: '600' },
  // Resources
  resourceCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: premium.glass, marginBottom: 8 },
  resourceCardActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.06)' },
  resourceName: { fontSize: 14, fontWeight: '700', color: premium.text },
  resourceMeta: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  resourceDesc: { fontSize: 11, color: premium.textMuted, marginTop: 4 },
  resourcePrice: { fontSize: 18, fontWeight: '900', color: premium.accentBlue },
  // Date picker
  dateRow: { marginBottom: 12 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: premium.glass, borderWidth: 1, borderColor: premium.glassBorder, marginRight: 8, alignItems: 'center' },
  dateChipActive: { backgroundColor: 'rgba(56,189,248,0.12)', borderColor: premium.accentBlue },
  dateChipDay: { fontSize: 11, fontWeight: '700', color: premium.textMuted },
  dateChipDate: { fontSize: 13, fontWeight: '700', color: premium.text, marginTop: 2 },
  dateChipTxtActive: { color: premium.accentBlue },
  // Slots
  noSlots: { color: premium.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: premium.glass, borderWidth: 1, borderColor: premium.glassBorder, alignItems: 'center', minWidth: 80 },
  slotTime: { fontSize: 15, fontWeight: '700', color: premium.text },
  slotPrice: { fontSize: 11, color: premium.accentGreen, marginTop: 2, fontWeight: '600' },
  // Trainers
  trainerMiniCard: { width: 120, alignItems: 'center', marginRight: 12, padding: 12, borderRadius: 14, backgroundColor: premium.glass, borderWidth: 1, borderColor: premium.glassBorder },
  trainerMiniPhoto: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 },
  trainerMiniImg: { width: '100%', height: '100%' },
  trainerMiniInitials: { color: '#fff', fontSize: 18, fontWeight: '900' },
  trainerMiniName: { fontSize: 12, fontWeight: '700', color: premium.text, textAlign: 'center' },
  trainerMiniSpec: { fontSize: 10, color: premium.textMuted, textAlign: 'center', marginTop: 2 },
  trainerMiniRating: { fontSize: 10, color: '#fbbf24', fontWeight: '800', marginTop: 4 },
  // Contact
  contactText: { fontSize: 14, color: premium.textMuted, marginBottom: 6 },
  // Sticky CTA
  stickyCta: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(5,8,16,0.95)', borderTopWidth: 1, borderTopColor: premium.glassBorder },
  stickyCtaBtn: { backgroundColor: premium.accentBlue, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  stickyCtaBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
