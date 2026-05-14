import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
const SLIDER_HEIGHT = 240;

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
  avgRating: string;
  reviewCount: number;
  priceRange: string | null;
  profileType: 'club' | 'trainer' | 'other';
  trainers: Array<{
    id: string;
    userId: string;
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
  events: Array<{
    id: string;
    title: string;
    description: string | null;
    coachName: string | null;
    location: string | null;
    imageUrl: string | null;
    startsAt: string;
    endsAt: string | null;
    capacity: number;
    category: string;
  }>;
  packages: Array<{
    id: string;
    name: string;
    sessionCount: number;
    price: string;
    currency: string;
    validityDays: number;
    sessionType: string;
  }>;
  metrics: {
    memberCount: number;
    totalBookings: number;
    completedBookings: number;
    trainerCount: number;
    thisMonthBookings: number;
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
  const [sliderPage, setSliderPage] = useState(0);

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

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { if (profile && token) loadSlots(); }, [profile, selectedDate, selectedResource, loadSlots, token]);

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

  const onSliderScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setSliderPage(page);
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
          <Text style={{ color: premium.textMuted, fontSize: 16 }}>Profil bulunamadı</Text>
        </View>
      </GradientBackground>
    );
  }

  const sliderImages = profile.galleryImages.length > 0
    ? profile.galleryImages
    : profile.coverImageUrl ? [profile.coverImageUrl] : [];

  return (
    <GradientBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={premium.accentBlue} />}
      >
        {/* Back button */}
        <Pressable style={[styles.backBtn, { top: insets.top + 10 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnTxt}>← Geri</Text>
        </Pressable>

        {/* ═══ Slider ═══ */}
        <View style={[styles.sliderContainer, { marginTop: insets.top }]}>
          {sliderImages.length > 0 ? (
            <>
              <ScrollView
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onSliderScroll}
                style={styles.slider}
              >
                {sliderImages.map((img, i) => (
                  <Image key={i} source={{ uri: img }} style={styles.sliderImage} resizeMode="cover" />
                ))}
              </ScrollView>
              {/* Dots */}
              {sliderImages.length > 1 && (
                <View style={styles.dotsRow}>
                  {sliderImages.map((_, i) => (
                    <View key={i} style={[styles.dot, sliderPage === i && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.sliderPlaceholder}>
              <Text style={{ fontSize: 48 }}>
                {profile.vertical === 'padel' ? '🎾' : profile.profileType === 'trainer' ? '🏋️' : '🏢'}
              </Text>
              <Text style={{ color: premium.textMuted, marginTop: 8, fontSize: 14 }}>{profile.name}</Text>
            </View>
          )}
        </View>

        {/* ═══ Header ═══ */}
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            {profile.logoUrl && (
              <Image source={{ uri: profile.logoUrl }} style={styles.headerLogo} resizeMode="contain" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName}>{profile.name}</Text>
              {profile.location && <Text style={styles.headerLocation}>📍 {profile.location}</Text>}
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
            {profile.metrics.thisMonthBookings > 0 && (
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{profile.metrics.thisMonthBookings}</Text>
                <Text style={styles.metricLabel}>Bu ay</Text>
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

        {/* ═══ Hizmetler ═══ */}
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

        {/* ═══ Eğitmenler (kulüp profili) — Etkinliklerden önce ═══ */}
        {profile.profileType === 'club' && profile.trainers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Eğitmenler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile.trainers.map((t) => (
                <Pressable
                  key={t.id}
                  style={styles.trainerCardWrapper}
                  onPress={() => {
                    (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate(
                      'TrainerDetail',
                      { trainerId: t.id },
                    );
                  }}
                >
                  <View style={styles.trainerCard}>
                    {t.avgRating !== '0.00' && (
                      <View style={styles.trainerRatingBadge}>
                        <Text style={styles.trainerRatingTxt}>★ {t.avgRating}</Text>
                      </View>
                    )}
                    <View style={styles.trainerPhotoArea}>
                      {t.photoUrl ? (
                        <Image source={{ uri: t.photoUrl }} style={styles.trainerPhotoImg} resizeMode="cover" />
                      ) : (
                        <Text style={styles.trainerInitialsTxt}>
                          {t.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.trainerInfoArea}>
                      <Text style={styles.trainerNameTxt} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.trainerSpecTxt} numberOfLines={1}>
                        {t.specializations.slice(0, 3).join(' · ')}
                      </Text>
                      {t.totalSessions > 0 && (
                        <Text style={styles.trainerSessionsTxt}>{t.totalSessions} seans</Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ═══ Etkinlikler ═══ */}
        {profile.events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Etkinlikler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile.events.map((evt) => {
                const d = new Date(evt.startsAt);
                return (
                  <View key={evt.id} style={styles.eventMiniCard}>
                    {evt.imageUrl ? (
                      <Image source={{ uri: evt.imageUrl }} style={styles.eventMiniImg} resizeMode="cover" />
                    ) : (
                      <View style={styles.eventMiniImgPlaceholder}><Text style={{ fontSize: 20 }}>📅</Text></View>
                    )}
                    <View style={styles.eventMiniBody}>
                      <Text style={styles.eventMiniDate}>
                        {d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} · {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.eventMiniTitle} numberOfLines={2}>{evt.title}</Text>
                      {evt.coachName && <Text style={styles.eventMiniCoach}>🏋️ {evt.coachName}</Text>}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ═══ Paketler & Fiyatlar ═══ */}
        {profile.packages.length > 0 && (profile.visibilityMode === 'public' || token) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💎 Paketler & Fiyatlar</Text>
            {profile.packages.map((pkg) => (
              <View key={pkg.id} style={styles.packageCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packageMeta}>
                    {pkg.sessionCount} seans · {pkg.validityDays} gün geçerli
                  </Text>
                  <Text style={styles.packageType}>
                    {pkg.sessionType === 'personal_training' ? '🏋️ Personal Training' : '💆 Masaj'}
                  </Text>
                </View>
                <View style={styles.packagePriceBox}>
                  <Text style={styles.packagePrice}>{pkg.price}₺</Text>
                  <Text style={styles.packagePerSession}>
                    {Math.round(parseFloat(pkg.price) / pkg.sessionCount)}₺/seans
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ═══ Kaynaklar & Ajanda ═══ */}
        {profile.resources.length > 0 && (profile.visibilityMode === 'public' || token) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛍️ Rezervasyon</Text>
            {/* Resource seçimi */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {profile.resources.map((r) => (
                <Pressable
                  key={r.id}
                  style={[styles.resourceChip, selectedResource === r.id && styles.resourceChipActive]}
                  onPress={() => setSelectedResource(r.id)}
                >
                  <Text style={[styles.resourceChipTxt, selectedResource === r.id && { color: premium.accentBlue }]}>
                    {r.name}
                  </Text>
                  <Text style={styles.resourceChipPrice}>{r.price}₺</Text>
                </Pressable>
              ))}
            </ScrollView>
            {/* Tarih seçimi */}
            {token && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
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
                {/* Slotlar */}
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
              </>
            )}
            {!token && (
              <Text style={styles.noSlots}>Müsait saatleri görmek için giriş yapın</Text>
            )}
          </View>
        )}

        {/* ═══ Özel Üyelik CTA (Private + Giriş yapmamış) ═══ */}
        {profile.visibilityMode === 'private' && !token && (
          <View style={styles.section}>
            <View style={styles.exclusiveCta}>
              <Text style={styles.exclusiveIcon}>🔒</Text>
              <Text style={styles.exclusiveTitle}>Özel Üyelik</Text>
              <Text style={styles.exclusiveDesc}>
                {profile.name}, özel üyelik ile çalışmaktadır.{'\n\n'}
                Üyelik avantajları:{'\n'}
                • Kişisel antrenman programları{'\n'}
                • Profesyonel masaj hizmetleri{'\n'}
                • Özel etkinlikler ve workshoplar{'\n'}
                • Online randevu sistemi
              </Text>
            </View>
          </View>
        )}

        {/* ═══ Eğitmen Bio (trainer profili) ═══ */}
        {profile.profileType === 'trainer' && profile.trainers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏋️ Eğitmen Hakkında</Text>
            {profile.trainers.map((t) => (
              <View key={t.id} style={styles.trainerBioCard}>
                <View style={styles.trainerBioHeader}>
                  <View style={styles.trainerBioPhoto}>
                    {t.photoUrl ? (
                      <Image source={{ uri: t.photoUrl }} style={{ width: '100%', height: '100%', borderRadius: 30 }} resizeMode="cover" />
                    ) : (
                      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>
                        {t.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trainerBioName}>{t.name}</Text>
                    <Text style={styles.trainerBioSpec}>{t.specializations.join(' · ')}</Text>
                    {t.totalSessions > 0 && (
                      <Text style={styles.trainerBioSessions}>✅ {t.totalSessions} tamamlanan seans</Text>
                    )}
                  </View>
                  {t.avgRating !== '0.00' && (
                    <View style={styles.trainerRatingBadge}>
                      <Text style={styles.trainerRatingTxt}>★ {t.avgRating}</Text>
                    </View>
                  )}
                </View>
                {t.bio && <Text style={styles.trainerBioText}>{t.bio}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* ═══ Konum ═══ */}
        {profile.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Konum</Text>
            <Text style={styles.locationText}>{profile.location}</Text>
          </View>
        )}
      </ScrollView>

      {/* ═══ Sticky CTA ═══ */}
      <View style={[styles.stickyCta, { paddingBottom: insets.bottom + 12 }]}>
        {!token ? (
          <View style={styles.stickyCtaRow}>
            <Pressable
              style={[styles.stickyCtaBtn, { flex: 1 }]}
              onPress={() => {
                (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate(
                  'Register',
                  { preselectedSubdomain: profile.subdomain },
                );
              }}
            >
              <Text style={styles.stickyCtaBtnTxt}>Hesap Oluştur</Text>
            </Pressable>
            <Pressable
              style={[styles.stickyCtaBtnOutline, { flex: 1 }]}
              onPress={() => {
                (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate('Login');
              }}
            >
              <Text style={styles.stickyCtaBtnOutlineTxt}>Giriş Yap</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.stickyCtaBtn}
            onPress={() => {
              if (profile.visibilityMode === 'public' && profile.resources.length > 0) {
                showToast('Yukarıdan saat seçip rezervasyon yapabilirsiniz ↑', 'info');
              } else {
                showToast('💬 Mesaj göndermek için kulüp kartındaki butonu kullanın', 'info');
              }
            }}
          >
            <Text style={styles.stickyCtaBtnTxt}>
              {profile.visibilityMode === 'public' ? '🎾 Rezervasyon Yap' : '💬 Mesaj Gönder'}
            </Text>
          </Pressable>
        )}
        {!token && (
          <Text style={styles.stickyCtaClubName}>🏢 {profile.name}</Text>
        )}
      </View>
    </GradientBackground>
  );
}

function getTodayStr() { return new Date().toISOString().slice(0, 10); }

function getNext7Days() {
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    result.push({ value: d.toISOString().slice(0, 10), label: `${d.getDate()}/${d.getMonth() + 1}`, dayName: days[d.getDay()] });
  }
  return result;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', left: 16, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  backBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Slider
  sliderContainer: { width: '100%', height: SLIDER_HEIGHT, position: 'relative' },
  slider: { width: '100%', height: SLIDER_HEIGHT },
  sliderImage: { width: SCREEN_WIDTH, height: SLIDER_HEIGHT },
  sliderPlaceholder: { width: '100%', height: SLIDER_HEIGHT, backgroundColor: '#0f1a2e', alignItems: 'center', justifyContent: 'center' },
  dotsRow: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#fff', width: 20 },
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
  // Events
  eventMiniCard: { width: 200, borderRadius: 14, borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: premium.glass, overflow: 'hidden', marginRight: 10 },
  eventMiniImg: { width: '100%', height: 80 },
  eventMiniImgPlaceholder: { width: '100%', height: 80, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  eventMiniBody: { padding: 10, gap: 3 },
  eventMiniDate: { fontSize: 11, color: premium.accentBlue, fontWeight: '700' },
  eventMiniTitle: { fontSize: 13, fontWeight: '700', color: premium.text, lineHeight: 17 },
  eventMiniCoach: { fontSize: 10, color: premium.textMuted },
  // Packages
  packageCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: premium.glass, marginBottom: 8 },
  packageName: { fontSize: 14, fontWeight: '700', color: premium.text },
  packageMeta: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  packageType: { fontSize: 11, color: premium.accentBlue, marginTop: 4, fontWeight: '600' },
  packagePriceBox: { alignItems: 'flex-end' },
  packagePrice: { fontSize: 18, fontWeight: '900', color: premium.accentGreen },
  packagePerSession: { fontSize: 10, color: premium.textMuted, marginTop: 2 },
  // Resources
  resourceChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: premium.glass, borderWidth: 1, borderColor: premium.glassBorder, marginRight: 8, alignItems: 'center' },
  resourceChipActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.08)' },
  resourceChipTxt: { fontSize: 12, fontWeight: '700', color: premium.text },
  resourceChipPrice: { fontSize: 10, color: premium.accentGreen, marginTop: 2, fontWeight: '600' },
  // Date picker
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
  // Trainers (keşif ekranı stili)
  trainerCardWrapper: { width: 184, marginRight: 12 },
  trainerCard: { width: '100%', height: 200, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(8,16,28,0.7)', overflow: 'hidden', position: 'relative' },
  trainerRatingBadge: { position: 'absolute', top: 8, right: 8, zIndex: 10, backgroundColor: 'rgba(251,191,36,0.2)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  trainerRatingTxt: { color: '#fbbf24', fontSize: 11, fontWeight: '900' },
  trainerPhotoArea: { width: '100%', height: 100, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  trainerPhotoImg: { width: '100%', height: 160, position: 'absolute', top: 0 },
  trainerInitialsTxt: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  trainerInfoArea: { flex: 1, padding: 12, gap: 3, justifyContent: 'center' },
  trainerNameTxt: { fontSize: 14, fontWeight: '800', color: premium.text },
  trainerSpecTxt: { fontSize: 11, color: premium.textMuted, fontWeight: '600' },
  trainerSessionsTxt: { fontSize: 10, color: premium.accentBlue, fontWeight: '700', marginTop: 2 },
  // Trainer Bio (trainer profile type)
  trainerBioCard: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: premium.glass },
  trainerBioHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trainerBioPhoto: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  trainerBioName: { fontSize: 16, fontWeight: '800', color: premium.text },
  trainerBioSpec: { fontSize: 12, color: premium.textMuted, marginTop: 2 },
  trainerBioSessions: { fontSize: 11, color: premium.accentGreen, fontWeight: '700', marginTop: 4 },
  trainerBioText: { fontSize: 14, color: premium.textMuted, lineHeight: 22, marginTop: 12 },
  // Location
  locationText: { fontSize: 14, color: premium.textMuted, lineHeight: 20 },
  // Sticky CTA
  stickyCta: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(5,8,16,0.95)', borderTopWidth: 1, borderTopColor: premium.glassBorder },
  stickyCtaBtn: { backgroundColor: premium.accentBlue, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  stickyCtaBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  stickyCtaRow: { flexDirection: 'row', gap: 10 },
  stickyCtaBtnOutline: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: 'rgba(255,255,255,0.05)' },
  stickyCtaBtnOutlineTxt: { color: premium.text, fontSize: 16, fontWeight: '800' },
  stickyCtaClubName: { color: premium.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  // Exclusive CTA
  exclusiveCta: { padding: 24, borderRadius: 16, backgroundColor: 'rgba(56,189,248,0.06)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)', alignItems: 'center' },
  exclusiveIcon: { fontSize: 36, marginBottom: 12 },
  exclusiveTitle: { fontSize: 20, fontWeight: '800', color: premium.text, marginBottom: 12 },
  exclusiveDesc: { fontSize: 14, lineHeight: 22, color: premium.textMuted, textAlign: 'center' },
});
