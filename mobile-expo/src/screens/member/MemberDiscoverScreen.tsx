import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { EventDetailModal } from '../../components/premium/EventDetailModal';
import { showToast } from '../../components/premium/Toast';
import { premium } from '../../theme/premiumTheme';
import type { MemberTabParamList } from '../../navigation/memberTabTypes';

type Club = {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  location: string | null;
  services: string[];
};
type Trainer = {
  id: string;
  userId: string;
  name: string;
  specialties: string[];
  avgRating: string;
  totalSessions: number;
  clubName: string;
  clubSubdomain: string;
};
type Event = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  category?: string;
  requirements?: string | null;
  schedule?: Array<{ time: string; title: string }> | null;
  clubName: string | null;
  clubSubdomain: string | null;
  isJoined?: boolean;
};
type Campaign = {
  id: string;
  title: string;
  discountKind: string;
  discountValue: string;
  originalPrice: string | null;
  discountedPrice: string | null;
  campaignType: string;
  tenant?: { name: string; subdomain: string };
};

const TAB_PAD = 80;

export function MemberDiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MemberTabParamList>>();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [c, t, e, camp] = await Promise.all([
        apiJson<Club[]>('/discovery/clubs?limit=10', { auth: false }),
        apiJson<Trainer[]>('/discovery/trainers?limit=20', { auth: false }),
        apiJson<Event[]>('/discovery/events?limit=15', { auth: false }),
        apiJson<Campaign[]>('/campaigns/featured?limit=6', { auth: false }),
      ]);
      setClubs(c);
      setTrainers(t);
      setEvents(e);
      setCampaigns(camp);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!token || !tenant) {
      showToast('Etkinliğe katılmak için giriş yapmalısınız', 'warning');
      return;
    }
    try {
      await apiJson(`/events/${eventId}/join`, {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
      });
      showToast('Etkinliğe katıldınız! ✓', 'success');
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, isJoined: true } : e)));
      setSelectedEvent(null);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.message.toLowerCase().includes('already')) {
          showToast('Zaten katıldınız', 'info');
        } else {
          showToast(e.message, 'error');
        }
      } else {
        showToast('Katılım başarısız', 'error');
      }
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!token || !tenant) return;
    try {
      await apiJson(`/events/${eventId}/join`, {
        method: 'DELETE',
        token,
        tenantSubdomain: tenant.subdomain,
      });
      showToast('Katılım iptal edildi', 'info');
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, isJoined: false } : e)));
    } catch {
      showToast('İptal edilemedi', 'error');
    }
  };

  const startChat = async (otherUserId: string, firstName: string, lastName: string) => {
    if (!token || !tenant) return;
    try {
      const res = await apiJson<{ conversationId: string }>('/messages/conversations', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({ otherUserId }),
      });
      navigation.navigate('Chat', {
        conversationId: res.conversationId,
        otherUser: { id: otherUserId, firstName, lastName, photoUrl: null },
      });
    } catch {
      showToast('Mesaj başlatılamadı', 'error');
    }
  };

  const startClubChat = async () => {
    if (!token || !tenant) return;
    try {
      const res = await apiJson<{ conversationId: string }>('/messages/conversations/club', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
      });
      navigation.navigate('Chat', {
        conversationId: res.conversationId,
        otherUser: { id: '', firstName: tenant.name || 'Kulüp', lastName: '', photoUrl: null },
      });
    } catch {
      showToast('Kulübe mesaj başlatılamadı', 'error');
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + TAB_PAD },
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
        <Text style={styles.title}>🔍 Keşfet</Text>
        <Text style={styles.subtitle}>Kulüpler, eğitmenler ve etkinlikler</Text>

        {/* ═══ Kampanyalar ═══ */}
        {campaigns.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🔥 Kampanyalar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {campaigns.map((c) => (
                <View key={c.id} style={styles.campaignCard}>
                  <View style={styles.campaignBadge}>
                    <Text style={styles.campaignBadgeTxt}>
                      {c.discountKind === 'percentage'
                        ? `%${c.discountValue}`
                        : `₺${c.discountValue}`}
                    </Text>
                  </View>
                  <Text style={styles.campaignTitle} numberOfLines={2}>
                    {c.title}
                  </Text>
                  {c.originalPrice && <Text style={styles.campaignOld}>₺{c.originalPrice}</Text>}
                  {c.discountedPrice && (
                    <Text style={styles.campaignNew}>₺{c.discountedPrice}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ═══ O'Padel — Kort Rezervasyonu ═══ */}
        {clubs.some((c) => c.subdomain === 'opadel') && (
          <>
            <Text style={styles.sectionTitle}>🎾 Padel Kortları</Text>
            <Pressable
              style={({ pressed }) => [styles.padelBanner, pressed && styles.pressed]}
              onPress={() => navigation.navigate('Padel')}
            >
              <View style={styles.padelBannerContent}>
                <View style={styles.padelIcon}>
                  <Text style={{ fontSize: 28 }}>🏟️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.padelTitle}>O'Padel</Text>
                  <Text style={styles.padelDesc}>
                    İstanbul'un en modern padel tesisi. Hemen kort rezervasyonu yapın!
                  </Text>
                </View>
                <Text style={styles.padelArrow}>→</Text>
              </View>
            </Pressable>
          </>
        )}

        {/* ═══ Etkinlikler ═══ */}
        {events.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📅 Yaklaşan Etkinlikler</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {events.map((evt) => (
                <Pressable
                  key={evt.id}
                  style={({ pressed }) => [styles.eventCard, pressed && styles.pressed]}
                  onPress={() => setSelectedEvent(evt)}
                >
                  {evt.isJoined && (
                    <View style={styles.joinedBadge}>
                      <Text style={styles.joinedTxt}>✓ Katıldın</Text>
                    </View>
                  )}
                  {evt.imageUrl && (
                    <Image
                      source={{ uri: evt.imageUrl }}
                      style={styles.eventImg}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.eventBody}>
                    <Text style={styles.eventDate}>
                      {fmtDate(evt.startsAt)} · {fmtTime(evt.startsAt)}
                    </Text>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {evt.title}
                    </Text>
                    {evt.coachName && <Text style={styles.eventCoach}>🏋️ {evt.coachName}</Text>}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* ═══ Eğitmenler ═══ */}
        {trainers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🏋️ Eğitmenler</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {trainers.map((tr) => (
                <View key={tr.id} style={styles.trainerCard}>
                  <View style={styles.trainerRating}>
                    <Text style={styles.trainerRatingTxt}>★ {tr.avgRating}</Text>
                  </View>
                  <View style={styles.trainerAvatar}>
                    <Text style={styles.trainerInitials}>
                      {tr.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </Text>
                  </View>
                  <Text style={styles.trainerName} numberOfLines={1}>
                    {tr.name}
                  </Text>
                  <Text style={styles.trainerSpec} numberOfLines={1}>
                    {tr.specialties.slice(0, 2).join(', ')}
                  </Text>
                  <Text style={styles.trainerClub} numberOfLines={1}>
                    {tr.clubName}
                  </Text>
                  <Pressable
                    style={styles.msgBtn}
                    onPress={() => {
                      if (!token || !tenant) {
                        showToast('Mesaj göndermek için giriş yapmalısınız', 'warning');
                        return;
                      }
                      const nameParts = tr.name.split(' ');
                      const firstName = nameParts[0] || '';
                      const lastName = nameParts.slice(1).join(' ') || '';
                      if (tr.userId) {
                        startChat(tr.userId, firstName, lastName);
                      } else {
                        showToast('Eğitmen bilgisi yüklenemedi', 'error');
                      }
                    }}
                  >
                    <Text style={styles.msgBtnTxt}>💬 Mesaj</Text>
                  </Pressable>
                  <Pressable
                    style={styles.connectBtn}
                    onPress={async () => {
                      if (!token || !tenant) {
                        showToast('Giriş yapmalısınız', 'warning');
                        return;
                      }
                      try {
                        await apiJson('/trainer-network/connect', {
                          method: 'POST',
                          token,
                          tenantSubdomain: tenant.subdomain,
                          body: JSON.stringify({ trainerId: tr.id }),
                        });
                        showToast('Eğitmeninize bağlandınız ✓', 'success');
                      } catch (e) {
                        if (e instanceof ApiError && e.message.toLowerCase().includes('already')) {
                          showToast('Zaten bağlısınız', 'info');
                        } else {
                          showToast(e instanceof ApiError ? e.message : 'Bağlanılamadı', 'error');
                        }
                      }
                    }}
                  >
                    <Text style={styles.connectBtnTxt}>➕ Ekle</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ═══ Kulüpler ═══ */}
        {clubs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🏢 Kulüpler</Text>
            {clubs.map((club) => (
              <Pressable
                key={club.id}
                style={({ pressed }) => [styles.clubRow, pressed && styles.pressed]}
              >
                <View style={styles.clubLogo}>
                  {club.logoUrl ? (
                    <Image
                      source={{ uri: club.logoUrl }}
                      style={styles.clubLogoImg}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.clubLogoTxt}>{club.name.slice(0, 2)}</Text>
                  )}
                </View>
                <View style={styles.clubInfo}>
                  <Text style={styles.clubName}>{club.name}</Text>
                  {club.location && <Text style={styles.clubLoc}>{club.location}</Text>}
                  {club.services.length > 0 && (
                    <Text style={styles.clubSvc}>{club.services.slice(0, 4).join(' · ')}</Text>
                  )}
                </View>
                <Pressable
                  style={styles.clubMsgBtn}
                  onPress={() => {
                    if (!token || !tenant) {
                      showToast('Mesaj göndermek için giriş yapmalısınız', 'warning');
                      return;
                    }
                    startClubChat();
                  }}
                >
                  <Text style={styles.clubMsgBtnTxt}>💬</Text>
                </Pressable>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isAuthenticated={!!token}
        onJoin={(id) => handleJoinEvent(id)}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: premium.text },
  subtitle: { fontSize: 14, color: premium.textMuted, marginBottom: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginTop: 20,
    marginBottom: 10,
  },
  hScroll: { gap: 10, paddingRight: 16 },
  pressed: { opacity: 0.85 },
  // Campaigns
  campaignCard: {
    width: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    backgroundColor: 'rgba(251,191,36,0.06)',
    padding: 12,
    gap: 4,
  },
  campaignBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  campaignBadgeTxt: { fontSize: 11, fontWeight: '800', color: '#fbbf24' },
  campaignTitle: { fontSize: 13, fontWeight: '700', color: premium.text, lineHeight: 17 },
  campaignOld: { fontSize: 11, color: premium.textMuted, textDecorationLine: 'line-through' },
  campaignNew: { fontSize: 14, color: premium.accentGreen, fontWeight: '800' },
  // Events
  eventCard: {
    width: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  eventImg: { width: '100%', height: 80 },
  eventBody: { padding: 10, gap: 3 },
  eventDate: { fontSize: 11, color: premium.accentBlue, fontWeight: '700' },
  eventTitle: { fontSize: 13, fontWeight: '700', color: premium.text, lineHeight: 17 },
  eventCoach: { fontSize: 11, color: premium.textMuted },
  joinedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(52,211,153,0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  joinedTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  // Trainers
  trainerCard: {
    width: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  trainerRating: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  trainerRatingTxt: { color: '#fbbf24', fontSize: 10, fontWeight: '800' },
  trainerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerInitials: { color: premium.accentBlue, fontSize: 14, fontWeight: '800' },
  trainerName: { fontSize: 13, fontWeight: '700', color: premium.text, textAlign: 'center' },
  trainerSpec: { fontSize: 10, color: premium.textMuted, textAlign: 'center' },
  trainerClub: { fontSize: 9, color: premium.accentBlue, textAlign: 'center' },
  msgBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  msgBtnTxt: { color: premium.accentBlue, fontSize: 11, fontWeight: '700' },
  connectBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  connectBtnTxt: { color: '#22c55e', fontSize: 11, fontWeight: '700' },
  // Clubs
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  clubLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  clubLogoImg: { width: '100%', height: '100%' },
  clubLogoTxt: { color: premium.accentBlue, fontSize: 16, fontWeight: '800' },
  clubInfo: { flex: 1 },
  clubName: { color: premium.text, fontSize: 15, fontWeight: '700' },
  clubLoc: { color: premium.textMuted, fontSize: 12, marginTop: 1 },
  clubSvc: { color: premium.textMuted, fontSize: 10, marginTop: 2 },
  clubMsgBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubMsgBtnTxt: { fontSize: 16 },
  // Padel Banner
  padelBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    backgroundColor: 'rgba(52,211,153,0.06)',
    padding: 16,
    marginBottom: 8,
  },
  padelBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  padelIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(52,211,153,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  padelTitle: { fontSize: 16, fontWeight: '800', color: premium.text },
  padelDesc: { fontSize: 12, color: premium.textMuted, marginTop: 2, lineHeight: 16 },
  padelArrow: { fontSize: 22, color: premium.accentGreen, fontWeight: '700' },
});
