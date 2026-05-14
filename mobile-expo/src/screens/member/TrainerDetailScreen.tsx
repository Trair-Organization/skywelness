import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
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

type TrainerProfile = {
  id: string;
  userId: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  specializations: string[];
  certifications: string[];
  avgRating: string;
  totalSessions: number;
  offersSessionTypes: string[];
  club: {
    id: string;
    name: string;
    subdomain: string;
    logoUrl: string | null;
    location: string | null;
  } | null;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: string;
    currency: string;
    capacity: number;
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
};

export function TrainerDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MemberTabParamList, 'TrainerDetail'>>();
  const { token, tenant } = useMemberAuth();
  const trainerId = route.params?.trainerId ?? '';
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!trainerId) return;
    try {
      const data = await apiJson<TrainerProfile>(
        `/trainers/${encodeURIComponent(trainerId)}/profile`,
        { auth: false },
      );
      setProfile(data);
    } catch {
      showToast('Profil yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => { load(); }, [load]);

  const handleContact = async () => {
    if (!token || !tenant || !profile) {
      showToast('Mesaj göndermek için giriş yapmalısınız', 'warning');
      return;
    }
    try {
      const res = await apiJson<{ conversationId: string }>('/messages/conversations', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({ otherUserId: profile.userId }),
      });
      const nameParts = profile.name.split(' ');
      (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate(
        'Chat',
        {
          conversationId: res.conversationId,
          otherUser: {
            id: profile.userId,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            photoUrl: profile.photoUrl,
          },
        },
      );
    } catch {
      showToast('Mesaj başlatılamadı', 'error');
    }
  };

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
          <Text style={{ color: premium.textMuted }}>Eğitmen bulunamadı</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Back */}
        <Pressable style={[styles.backBtn, { top: insets.top + 10 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnTxt}>← Geri</Text>
        </Pressable>

        {/* Photo */}
        <View style={styles.photoArea}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.photoImg} resizeMode="cover" />
          ) : (
            <Text style={styles.photoInitials}>
              {profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </Text>
          )}
          <View style={styles.photoGradient} />
        </View>

        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.name}>{profile.name}</Text>

          {/* Metrics */}
          <View style={styles.metricsRow}>
            {profile.avgRating !== '0.00' && (
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>★ {profile.avgRating}</Text>
                <Text style={styles.metricLabel}>Puan</Text>
              </View>
            )}
            {profile.totalSessions > 0 && (
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{profile.totalSessions}</Text>
                <Text style={styles.metricLabel}>Seans</Text>
              </View>
            )}
          </View>

          {/* Hizmet türü badge */}
          {profile.offersSessionTypes.length > 0 && (
            <View style={[styles.chipsRow, { marginTop: 12 }]}>
              {profile.offersSessionTypes.map((s, i) => (
                <View key={i} style={[styles.chip, styles.chipService]}>
                  <Text style={[styles.chipTxt, { color: premium.accentBlue }]}>
                    {s === 'personal_training' ? '🏋️ Personal Training' : s === 'massage' ? '💆 Masaj' : s}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Hakkında</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Uzmanlık */}
        {profile.specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Uzmanlık Alanları</Text>
            <View style={styles.chipsRow}>
              {profile.specializations.map((s, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipTxt}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sertifikalar */}
        {profile.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📜 Sertifikalar</Text>
            <View style={styles.chipsRow}>
              {profile.certifications.map((c, i) => (
                <View key={i} style={[styles.chip, styles.chipCert]}>
                  <Text style={[styles.chipTxt, { color: premium.accentGreen }]}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Hizmetler (fiyatlı) — sadece giriş yapmış üyeler + session type filtreli */}
        {token && profile.services && profile.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛍️ Hizmetler & Fiyatlar</Text>
            {profile.services
              .filter((s) => {
                // Sadece bu eğitmenin session type'ına uygun hizmetleri göster
                const name = s.name.toLowerCase();
                if (profile.offersSessionTypes.includes('personal_training') && !profile.offersSessionTypes.includes('massage')) {
                  return !name.includes('masaj') && !name.includes('massage');
                }
                if (profile.offersSessionTypes.includes('massage') && !profile.offersSessionTypes.includes('personal_training')) {
                  return !name.includes('personal') && !name.includes('pt');
                }
                return true;
              })
              .map((s) => (
              <View key={s.id} style={styles.serviceCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{s.name}</Text>
                  <Text style={styles.serviceMeta}>⏱ {s.durationMinutes} dk</Text>
                  {s.description && <Text style={styles.serviceDesc}>{s.description}</Text>}
                </View>
                <Text style={styles.servicePrice}>{s.price}₺</Text>
              </View>
            ))}
          </View>
        )}

        {/* Paketler — sadece giriş yapmış üyeler + session type filtreli */}
        {token && profile.packages && profile.packages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💎 Paketler</Text>
            {profile.packages
              .filter((p) => profile.offersSessionTypes.includes(p.sessionType))
              .map((p) => (
              <View key={p.id} style={styles.packageCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.packageName}>{p.name}</Text>
                  <Text style={styles.packageMeta}>{p.sessionCount} seans · {p.validityDays} gün geçerli</Text>
                  <Text style={styles.packagePerSession}>{Math.round(parseFloat(p.price) / p.sessionCount)}₺/seans</Text>
                </View>
                <Text style={styles.packagePrice}>{p.price}₺</Text>
              </View>
            ))}
          </View>
        )}

        {/* Üyelik CTA — kayıtsız kullanıcılar için */}
        {!token && profile.club && (
          <View style={styles.section}>
            <View style={styles.exclusiveCta}>
              <Text style={styles.exclusiveIcon}>🔒</Text>
              <Text style={styles.exclusiveTitle}>Üyelik Gerekli</Text>
              <Text style={styles.exclusiveDesc}>
                Bu eğitmenle çalışmak için {profile.club.name}'a üye olmanız gerekiyor.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyCta, { paddingBottom: insets.bottom + 12 }]}>
        {!token ? (
          <View style={styles.stickyCtaRow}>
            <Pressable
              style={[styles.stickyCtaBtn, { flex: 1 }]}
              onPress={() => {
                (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate(
                  'Register',
                  { preselectedSubdomain: profile.club?.subdomain },
                );
              }}
            >
              <Text style={styles.stickyCtaBtnTxt}>Hesap Oluştur</Text>
            </Pressable>
            <Pressable
              style={[styles.stickyCtaBtnOutline, { flex: 1 }]}
              onPress={() => {
                (navigation as unknown as { navigate: (n: string) => void }).navigate('Login');
              }}
            >
              <Text style={styles.stickyCtaBtnOutlineTxt}>Giriş Yap</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.stickyCtaBtn} onPress={handleContact}>
            <Text style={styles.stickyCtaBtnTxt}>💬 Mesaj Gönder</Text>
          </Pressable>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', left: 16, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  backBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  photoArea: { width: '100%', aspectRatio: 3 / 4, maxHeight: 420, backgroundColor: '#0f1a2e', overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%', position: 'absolute', top: 0 },
  photoGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'transparent' },
  photoInitials: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: 2 },
  headerSection: { paddingHorizontal: 20, paddingTop: 20 },
  name: { fontSize: 26, fontWeight: '900', color: premium.text },
  clubLink: { fontSize: 14, color: premium.accentBlue, fontWeight: '700', marginTop: 4 },
  location: { fontSize: 13, color: premium.textMuted, marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: 24, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: premium.glassBorder },
  metricItem: { alignItems: 'center' },
  metricValue: { fontSize: 20, fontWeight: '900', color: premium.text },
  metricLabel: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: premium.text, marginBottom: 12 },
  bioText: { fontSize: 14, color: premium.textMuted, lineHeight: 22 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: premium.glass, borderWidth: 1, borderColor: premium.glassBorder },
  chipCert: { borderColor: 'rgba(52,211,153,0.3)' },
  chipService: { borderColor: 'rgba(56,189,248,0.3)' },
  chipTxt: { color: premium.text, fontSize: 12, fontWeight: '600' },
  // Services
  serviceCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 8 },
  serviceName: { fontSize: 14, fontWeight: '700', color: premium.text },
  serviceMeta: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  serviceDesc: { fontSize: 11, color: premium.textMuted, marginTop: 4, fontStyle: 'italic' },
  servicePrice: { fontSize: 18, fontWeight: '900', color: premium.accentBlue },
  // Packages
  packageCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)', backgroundColor: 'rgba(52,211,153,0.04)', marginBottom: 8 },
  packageName: { fontSize: 14, fontWeight: '700', color: premium.text },
  packageMeta: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  packagePerSession: { fontSize: 11, color: premium.accentGreen, fontWeight: '600', marginTop: 2 },
  packagePrice: { fontSize: 18, fontWeight: '900', color: premium.accentGreen },
  stickyCta: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(5,8,16,0.95)', borderTopWidth: 1, borderTopColor: premium.glassBorder },
  stickyCtaBtn: { backgroundColor: premium.accentGreen, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  stickyCtaBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  stickyCtaRow: { flexDirection: 'row', gap: 10 },
  stickyCtaBtnOutline: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: 'rgba(255,255,255,0.05)' },
  stickyCtaBtnOutlineTxt: { color: premium.text, fontSize: 16, fontWeight: '800' },
  exclusiveCta: { padding: 24, borderRadius: 16, backgroundColor: 'rgba(56,189,248,0.06)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)', alignItems: 'center' },
  exclusiveIcon: { fontSize: 36, marginBottom: 12 },
  exclusiveTitle: { fontSize: 20, fontWeight: '800', color: premium.text, marginBottom: 12 },
  exclusiveDesc: { fontSize: 14, lineHeight: 22, color: premium.textMuted, textAlign: 'center' },
});
