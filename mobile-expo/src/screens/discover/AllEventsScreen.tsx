import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { EventDetailModal } from '../../components/premium/EventDetailModal';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { showToast } from '../../components/premium/Toast';
import { premium } from '../../theme/premiumTheme';

type EventItem = {
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
  price?: string | null;
  currency?: string | null;
  clubName: string | null;
  clubSubdomain: string | null;
};

export function AllEventsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, tenant, user } = useMemberAuth();
  const isAuthenticated = Boolean(user && token);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    apiJson<EventItem[]>('/discovery/events?limit=50', { auth: false })
      .then(setEvents)
      .catch(() => {});
  }, []);

  const handleJoin = async (eventId: string) => {
    if (!token || !tenant) {
      showToast('Giriş yapmalısınız', 'warning');
      return;
    }
    try {
      await apiJson(`/events/${eventId}/join`, {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
      });
      showToast('Etkinliğe katıldınız! ✓', 'success');
      setSelectedEvent(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Katılım başarısız', 'error');
    }
  };

  return (
    <GradientBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Geri</Text>
        </Pressable>
        <Text style={styles.title}>Tüm Etkinlikler</Text>
        <Text style={styles.subtitle}>{events.length} yaklaşan etkinlik</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {events.map((evt) => {
          const date = new Date(evt.startsAt);
          const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
          const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          const price = parseFloat(evt.price || '0');
          return (
            <Pressable
              key={evt.id}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              onPress={() => setSelectedEvent(evt)}
            >
              {evt.imageUrl ? (
                <Image source={{ uri: evt.imageUrl }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Text style={{ fontSize: 28 }}>📅</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {evt.title}
                </Text>
                <Text style={styles.cardMeta}>
                  📅 {dateStr} · 🕐 {timeStr}
                </Text>
                {evt.clubName && <Text style={styles.cardMeta}>🏢 {evt.clubName}</Text>}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardCapacity}>👥 {evt.capacity} kişi</Text>
                  <Text style={price > 0 ? styles.cardPrice : styles.cardFree}>
                    {price > 0 ? `${price.toLocaleString('tr-TR')}₺` : 'Ücretsiz'}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isAuthenticated={isAuthenticated}
        onRegister={() => {
          setSelectedEvent(null);
          (navigation as unknown as { navigate: (n: string) => void }).navigate('Register');
        }}
        onLogin={() => {
          setSelectedEvent(null);
          (navigation as unknown as { navigate: (n: string) => void }).navigate('Login');
        }}
        onJoin={handleJoin}
      />
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
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: premium.text, marginBottom: 4 },
  cardMeta: { fontSize: 11, color: premium.textMuted, marginBottom: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  cardCapacity: { fontSize: 11, color: premium.textMuted },
  cardPrice: { fontSize: 13, fontWeight: '800', color: '#a5b4fc' },
  cardFree: { fontSize: 12, fontWeight: '700', color: '#10b981' },
});
