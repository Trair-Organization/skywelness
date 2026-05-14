import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { premium } from '../../theme/premiumTheme';

type Club = {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  location: string | null;
  avgRating: string;
  reviewCount: number;
  vertical: string;
  visibilityMode: string;
};

export function AllClubsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [clubs, setClubs] = useState<Club[]>([]);

  useEffect(() => {
    apiJson<Club[]>('/discovery/clubs?limit=50', { auth: false })
      .then(setClubs)
      .catch(() => {});
  }, []);

  return (
    <GradientBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Geri</Text>
        </Pressable>
        <Text style={styles.title}>Tüm Kulüpler</Text>
        <Text style={styles.subtitle}>{clubs.length} kulüp listeleniyor</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {clubs.map((club) => (
          <Pressable
            key={club.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            onPress={() =>
              (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate(
                'PartnerProfile',
                { subdomain: club.subdomain },
              )
            }
          >
            {club.coverImageUrl ? (
              <Image source={{ uri: club.coverImageUrl }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Text style={{ fontSize: 32 }}>🏢</Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                {club.logoUrl && <Image source={{ uri: club.logoUrl }} style={styles.logo} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {club.name}
                  </Text>
                  {club.location && (
                    <Text style={styles.cardLocation} numberOfLines={1}>
                      📍 {club.location}
                    </Text>
                  )}
                </View>
                {club.visibilityMode === 'private' && (
                  <View style={styles.privateBadge}>
                    <Text style={styles.privateTxt}>🔒</Text>
                  </View>
                )}
              </View>
              {club.description && (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {club.description}
                </Text>
              )}
              <View style={styles.cardMeta}>
                <Text style={styles.metaItem}>⭐ {parseFloat(club.avgRating).toFixed(1)}</Text>
                <Text style={styles.metaItem}>💬 {club.reviewCount} değerlendirme</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { marginBottom: 8 },
  backTxt: { color: premium.accentBlue, fontSize: 14, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '900', color: premium.text },
  subtitle: { fontSize: 13, color: premium.textMuted, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  cardImage: { width: '100%', height: 140 },
  cardImagePlaceholder: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 18 },
  cardName: { fontSize: 16, fontWeight: '800', color: premium.text },
  cardLocation: { fontSize: 12, color: premium.textMuted, marginTop: 2 },
  cardDesc: { fontSize: 12, color: premium.textMuted, marginTop: 8, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', gap: 14, marginTop: 10 },
  metaItem: { fontSize: 11, color: premium.textMuted, fontWeight: '600' },
  privateBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  privateTxt: { fontSize: 14 },
});
