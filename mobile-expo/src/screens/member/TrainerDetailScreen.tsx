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
        </View>

        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.name}>{profile.name}</Text>
          {profile.club && (
            <Pressable
              onPress={() => {
                (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate(
                  'PartnerProfile',
                  { subdomain: profile.club!.subdomain },
                );
              }}
            >
              <Text style={styles.clubLink}>🏢 {profile.club.name}</Text>
            </Pressable>
          )}
          {profile.club?.location && (
            <Text style={styles.location}>📍 {profile.club.location}</Text>
          )}

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

        {/* Hizmet Tipleri */}
        {profile.offersSessionTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏋️ Verdiği Hizmetler</Text>
            <View style={styles.chipsRow}>
              {profile.offersSessionTypes.map((s, i) => (
                <View key={i} style={[styles.chip, styles.chipService]}>
                  <Text style={[styles.chipTxt, { color: premium.accentBlue }]}>
                    {s === 'personal_training' ? 'Personal Training' : s === 'massage' ? 'Masaj' : s}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyCta, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.stickyCtaBtn} onPress={handleContact}>
          <Text style={styles.stickyCtaBtnTxt}>💬 İletişime Geç</Text>
        </Pressable>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', left: 16, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  backBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  photoArea: { width: '100%', height: 280, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
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
  stickyCta: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(5,8,16,0.95)', borderTopWidth: 1, borderTopColor: premium.glassBorder },
  stickyCtaBtn: { backgroundColor: premium.accentGreen, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  stickyCtaBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
