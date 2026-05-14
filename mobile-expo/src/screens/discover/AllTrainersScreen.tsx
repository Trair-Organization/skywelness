import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { premium } from '../../theme/premiumTheme';

type Trainer = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  specializations: string[];
  avgRating: string;
  totalSessions: number;
  clubName: string | null;
};

export function AllTrainersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  useEffect(() => {
    apiJson<Trainer[]>('/discovery/trainers?limit=50', { auth: false })
      .then(setTrainers)
      .catch(() => {});
  }, []);

  return (
    <GradientBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Geri</Text>
        </Pressable>
        <Text style={styles.title}>Tüm Eğitmenler</Text>
        <Text style={styles.subtitle}>{trainers.length} eğitmen listeleniyor</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {trainers.map((t) => (
          <Pressable
            key={t.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            onPress={() =>
              (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate(
                'TrainerDetail',
                { trainerId: t.id },
              )
            }
          >
            {t.photoUrl ? (
              <Image source={{ uri: t.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={{ fontSize: 24 }}>🏋️</Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>
                {t.firstName} {t.lastName}
              </Text>
              {t.clubName && <Text style={styles.cardClub}>🏢 {t.clubName}</Text>}
              {t.specializations.length > 0 && (
                <Text style={styles.cardSpecs} numberOfLines={1}>
                  {t.specializations.slice(0, 3).join(' · ')}
                </Text>
              )}
              <View style={styles.cardMeta}>
                <Text style={styles.metaItem}>⭐ {parseFloat(t.avgRating).toFixed(1)}</Text>
                <Text style={styles.metaItem}>📋 {t.totalSessions} seans</Text>
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
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    gap: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '800', color: premium.text },
  cardClub: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  cardSpecs: { fontSize: 11, color: premium.accentBlue, marginTop: 4, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { fontSize: 11, color: premium.textMuted, fontWeight: '600' },
});
