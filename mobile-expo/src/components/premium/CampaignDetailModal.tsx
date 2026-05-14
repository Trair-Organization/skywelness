import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { premium } from '../../theme/premiumTheme';

type CampaignData = {
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
  clubSubdomain?: string | null;
  actionType?: 'instant_buy' | 'lead_only' | 'both';
};

type Props = {
  campaign: CampaignData | null;
  onClose: () => void;
  onBuy?: (campaignId: string) => void;
  onRequestInfo?: (campaign: CampaignData) => void;
  isAuthenticated?: boolean;
};

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  massage_package: { icon: '💆', label: 'Masaj Paketi' },
  personal_training: { icon: '🏋️', label: 'Personal Training' },
  membership: { icon: '🎫', label: 'Üyelik' },
  general: { icon: '🔥', label: 'Kampanya' },
};

export function CampaignDetailModal({
  campaign,
  onClose,
  onBuy: _onBuy,
  onRequestInfo,
  isAuthenticated = false,
}: Props) {
  if (!campaign) return null;

  const startDate = new Date(campaign.startsAt);
  const endDate = new Date(campaign.endsAt);
  const startStr = startDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const endStr = endDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const actionType = campaign.actionType ?? 'both';
  const showBuy = actionType === 'instant_buy' || actionType === 'both';
  const showInfo = actionType === 'lead_only' || actionType === 'both';
  const buyAmount = parseFloat(campaign.discountedPrice || campaign.originalPrice || '0');
  const kaporaAmount = Math.ceil(buyAmount * 0.15);
  const cat = TYPE_LABELS[campaign.campaignType] ?? TYPE_LABELS.general;
  const discountLabel =
    campaign.discountKind === 'percentage'
      ? `%${parseFloat(campaign.discountValue).toFixed(0)} İndirim`
      : `${parseFloat(campaign.discountValue).toFixed(0)}₺ İndirim`;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {campaign.imageUrl ? (
              <Image
                source={{ uri: campaign.imageUrl }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.coverImage, styles.coverPlaceholder]}>
                <Text style={styles.coverEmoji}>{cat.icon}</Text>
              </View>
            )}

            {/* Kategori + İndirim Badge */}
            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountTxt}>{discountLabel}</Text>
              </View>
            </View>

            <Text style={styles.title}>{campaign.title}</Text>

            {/* Fiyat bilgisi */}
            {(campaign.originalPrice || campaign.discountedPrice) && (
              <View style={styles.priceSection}>
                {campaign.originalPrice && (
                  <Text style={styles.originalPrice}>
                    {parseFloat(campaign.originalPrice).toLocaleString('tr-TR')}₺
                  </Text>
                )}
                {campaign.discountedPrice && (
                  <Text style={styles.discountedPrice}>
                    {parseFloat(campaign.discountedPrice).toLocaleString('tr-TR')}₺
                  </Text>
                )}
              </View>
            )}

            {/* Meta */}
            <View style={styles.metaSection}>
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text style={styles.metaText}>
                  {startStr} — {endStr}
                </Text>
              </View>
              {campaign.clubName && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>🏢</Text>
                  <Text style={styles.metaText}>{campaign.clubName}</Text>
                </View>
              )}
            </View>

            {/* Açıklama */}
            {campaign.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Kampanya Detayı</Text>
                <Text style={styles.sectionBody}>{campaign.description}</Text>
              </View>
            )}

            {/* Koşullar */}
            {campaign.terms && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📋 Koşullar</Text>
                <Text style={styles.sectionBody}>{campaign.terms}</Text>
              </View>
            )}
          </ScrollView>

          {/* CTA */}
          <View style={styles.ctaBar}>
            {/* Hemen Satın Al butonu şimdilik gizli — daha sonra açılacak
            {showBuy && buyAmount > 0 && (
              <Pressable
                style={({ pressed }) => [styles.buyBtn, pressed && { opacity: 0.85 }]}
                onPress={() => _onBuy?.(campaign.id)}
              >
                <Text style={styles.buyBtnTxt}>
                  💳 Hemen Satın Al · {kaporaAmount.toLocaleString('tr-TR')}₺ kapora
                </Text>
              </Pressable>
            )}
            */}
            <Pressable
              style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.85 }]}
              onPress={() => onRequestInfo?.(campaign)}
            >
              <Text style={styles.infoBtnTxt}>
                {isAuthenticated ? '💬 Kulübe Mesaj Gönder' : '📋 Bilgi Almak İçin Başvur'}
              </Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnTxt}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0a1020',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  scrollContent: { paddingBottom: 20 },
  coverImage: { width: '100%', height: 200, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  coverPlaceholder: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: { fontSize: 48 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryIcon: { fontSize: 14 },
  categoryLabel: { color: premium.accentBlue, fontSize: 12, fontWeight: '700' },
  discountBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountTxt: { color: '#fbbf24', fontSize: 12, fontWeight: '800' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: premium.text,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  originalPrice: { fontSize: 16, color: premium.textMuted, textDecorationLine: 'line-through' },
  discountedPrice: { fontSize: 24, fontWeight: '900', color: '#10b981' },
  metaSection: { paddingHorizontal: 20, marginTop: 14, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaIcon: { fontSize: 16, width: 24 },
  metaText: { color: premium.textMuted, fontSize: 14, fontWeight: '600', flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { color: premium.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  sectionBody: { color: premium.textMuted, fontSize: 14, lineHeight: 21 },
  ctaBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: premium.glassBorder,
    gap: 10,
  },
  buyBtn: {
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
  },
  buyBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  infoBtn: {
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  infoBtnTxt: { color: premium.accentBlue, fontSize: 14, fontWeight: '700' },
  closeBtn: { height: 40, alignItems: 'center', justifyContent: 'center' },
  closeBtnTxt: { color: premium.textMuted, fontSize: 13, fontWeight: '600' },
});
