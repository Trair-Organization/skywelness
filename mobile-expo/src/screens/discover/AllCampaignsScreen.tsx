import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { CampaignDetailModal } from '../../components/premium/CampaignDetailModal';
import { premium } from '../../theme/premiumTheme';

type CampaignItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  campaignType: string;
  discountKind: string;
  discountValue: string;
  originalPrice: string | null;
  discountedPrice: string | null;
  terms: string | null;
  startsAt: string;
  endsAt: string;
  clubName?: string | null;
};

export function AllCampaignsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [selected, setSelected] = useState<CampaignItem | null>(null);

  useEffect(() => {
    apiJson<CampaignItem[]>('/campaigns/public?limit=30', { auth: false })
      .then(setCampaigns)
      .catch(() => {});
  }, []);

  return (
    <GradientBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Geri</Text>
        </Pressable>
        <Text style={styles.title}>Tüm Kampanyalar</Text>
        <Text style={styles.subtitle}>{campaigns.length} aktif kampanya</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {campaigns.map((c) => {
          const discountLabel =
            c.discountKind === 'percentage'
              ? `%${parseFloat(c.discountValue).toFixed(0)}`
              : `${parseFloat(c.discountValue).toFixed(0)}₺`;
          return (
            <Pressable
              key={c.id}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              onPress={() => setSelected(c)}
            >
              {c.imageUrl ? (
                <Image source={{ uri: c.imageUrl }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Text style={{ fontSize: 28 }}>🔥</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {c.title}
                </Text>
                {c.clubName && <Text style={styles.cardClub}>🏢 {c.clubName}</Text>}
                <View style={styles.cardFooter}>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountTxt}>{discountLabel} İndirim</Text>
                  </View>
                  {c.discountedPrice && (
                    <Text style={styles.cardPrice}>
                      {parseFloat(c.discountedPrice).toLocaleString('tr-TR')}₺
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <CampaignDetailModal campaign={selected} onClose={() => setSelected(null)} />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { marginBottom: 8 },
  backTxt: { color: premium.accentBlue, fontSize: 14, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '900', color: premium.text },
  subtitle: { fontSize: 13, color: premium.textMuted, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  cardImage: { width: 100, height: 100 },
  cardImagePlaceholder: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: premium.text, marginBottom: 4 },
  cardClub: { fontSize: 11, color: premium.textMuted, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  discountBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountTxt: { color: '#fbbf24', fontSize: 11, fontWeight: '800' },
  cardPrice: { fontSize: 15, fontWeight: '900', color: '#10b981' },
});
