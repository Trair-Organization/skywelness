import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';

type ConnectionReq = {
  id: string;
  direction: string;
  connectionType: string;
  status: string;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  sender: { name: string; publicId: string | null; role: string | null };
  receiver: { name: string; publicId: string | null; role: string | null };
};

const TYPE_LABELS: Record<string, string> = {
  trainer_to_club: '🏋️→🏢 Eğitmen → Kulüp',
  club_to_trainer: '🏢→🏋️ Kulüp → Eğitmen',
  member_to_club: '👤→🏢 Üye → Kulüp',
  club_to_member: '🏢→👤 Kulüp → Üye',
  member_to_trainer: '👤→🏋️ Üye → Eğitmen',
  trainer_to_member: '🏋️→👤 Eğitmen → Üye',
};

export function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const { token, tenant, user } = useMemberAuth();
  const [tab, setTab] = useState<'incoming' | 'sent' | 'accepted'>('incoming');
  const [incoming, setIncoming] = useState<ConnectionReq[]>([]);
  const [sent, setSent] = useState<ConnectionReq[]>([]);
  const [accepted, setAccepted] = useState<ConnectionReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Send new request
  const [showSend, setShowSend] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);

  const opts = { token: token ?? undefined, tenantSubdomain: tenant?.subdomain };

  const load = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const [inc, snt, acc] = await Promise.all([
        apiJson<ConnectionReq[]>('/connections/incoming', opts),
        apiJson<ConnectionReq[]>('/connections/sent', opts),
        apiJson<ConnectionReq[]>('/connections/accepted', opts),
      ]);
      setIncoming(inc);
      setSent(snt);
      setAccepted(acc);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, tenant]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const handleAccept = async (id: string) => {
    try {
      await apiJson(`/connections/${id}/accept`, { ...opts, method: 'POST' });
      Alert.alert('✅', 'Bağlantı kabul edildi');
      void load();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Kabul edilemedi');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiJson(`/connections/${id}/reject`, {
        ...opts,
        method: 'POST',
        body: JSON.stringify({}),
      });
      Alert.alert('❌', 'İstek reddedildi');
      void load();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Reddedilemedi');
    }
  };

  const handleSend = async () => {
    if (!targetId.trim()) return;
    setSending(true);
    try {
      const endpoint =
        user?.role === 'administrator' ? '/connections/send-as-club' : '/connections/send';
      await apiJson(endpoint, {
        ...opts,
        method: 'POST',
        body: JSON.stringify({
          receiverPublicId: targetId.trim().toUpperCase(),
          message: sendMessage.trim() || undefined,
        }),
      });
      Alert.alert('✅', 'Bağlantı isteği gönderildi');
      setShowSend(false);
      setTargetId('');
      setSendMessage('');
      void load();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const currentList = tab === 'incoming' ? incoming : tab === 'sent' ? sent : accepted;

  if (loading && !refreshing) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={premium.accentBlue}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>🔗 Bağlantılar</Text>
          <Pressable style={styles.sendBtn} onPress={() => setShowSend(!showSend)}>
            <Text style={styles.sendBtnText}>+ Gönder</Text>
          </Pressable>
        </View>

        {/* Send Form */}
        {showSend && (
          <GlassCard style={styles.sendCard}>
            <Text style={styles.sendTitle}>Bağlantı İsteği Gönder</Text>
            <Text style={styles.sendHint}>
              Alıcının ID'sini girin (MBR-0001, TRN-0001, CLB-0001)
            </Text>
            <TextInput
              style={styles.input}
              value={targetId}
              onChangeText={(v) => setTargetId(v.toUpperCase())}
              placeholder="CLB-0001"
              placeholderTextColor={premium.textMuted}
              autoCapitalize="characters"
            />
            <TextInput
              style={[styles.input, { minHeight: 50 }]}
              value={sendMessage}
              onChangeText={setSendMessage}
              placeholder="Mesaj (opsiyonel)"
              placeholderTextColor={premium.textMuted}
              multiline
            />
            <Pressable
              style={[styles.confirmBtn, (!targetId.trim() || sending) && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={!targetId.trim() || sending}
            >
              <Text style={styles.confirmBtnText}>{sending ? '⏳...' : '→ Gönder'}</Text>
            </Pressable>
          </GlassCard>
        )}

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, tab === 'incoming' && styles.tabActive]}
            onPress={() => setTab('incoming')}
          >
            <Text style={[styles.tabText, tab === 'incoming' && styles.tabTextActive]}>
              Gelen {incoming.length > 0 ? `(${incoming.length})` : ''}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'sent' && styles.tabActive]}
            onPress={() => setTab('sent')}
          >
            <Text style={[styles.tabText, tab === 'sent' && styles.tabTextActive]}>Gönderilen</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'accepted' && styles.tabActive]}
            onPress={() => setTab('accepted')}
          >
            <Text style={[styles.tabText, tab === 'accepted' && styles.tabTextActive]}>
              Kabul Edilen
            </Text>
          </Pressable>
        </View>

        {/* List */}
        {currentList.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {tab === 'incoming'
                ? 'Gelen istek yok'
                : tab === 'sent'
                  ? 'Gönderilen istek yok'
                  : 'Henüz kabul edilen bağlantı yok'}
            </Text>
          </GlassCard>
        ) : (
          currentList.map((r) => (
            <GlassCard key={r.id} style={styles.reqCard}>
              <View style={styles.reqHeader}>
                <Text style={styles.reqType}>
                  {TYPE_LABELS[r.connectionType] ?? r.connectionType}
                </Text>
                <Text style={styles.reqDate}>{fmtDate(r.createdAt)}</Text>
              </View>
              <View style={styles.reqBody}>
                <Text style={styles.reqName}>
                  {tab === 'incoming' ? `${r.sender.name}` : `${r.receiver.name}`}
                </Text>
                <Text style={styles.reqId}>
                  {tab === 'incoming' ? r.sender.publicId : r.receiver.publicId}
                </Text>
              </View>
              {r.message && <Text style={styles.reqMessage}>💬 {r.message}</Text>}
              {tab === 'incoming' && r.status === 'pending' && (
                <View style={styles.reqActions}>
                  <Pressable style={styles.acceptBtn} onPress={() => handleAccept(r.id)}>
                    <Text style={styles.acceptBtnText}>✓ Kabul Et</Text>
                  </Pressable>
                  <Pressable style={styles.rejectBtn} onPress={() => handleReject(r.id)}>
                    <Text style={styles.rejectBtnText}>✕ Reddet</Text>
                  </Pressable>
                </View>
              )}
              {tab === 'sent' && (
                <View
                  style={[
                    styles.statusBadge,
                    r.status === 'accepted' && styles.statusAccepted,
                    r.status === 'rejected' && styles.statusRejected,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {r.status === 'pending'
                      ? '⏳ Bekliyor'
                      : r.status === 'accepted'
                        ? '✅ Kabul Edildi'
                        : r.status === 'rejected'
                          ? '❌ Reddedildi'
                          : '🚫 İptal'}
                  </Text>
                </View>
              )}
            </GlassCard>
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: premium.text },
  sendBtn: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: premium.accentBlue },
  // Send form
  sendCard: { marginBottom: 16, borderColor: 'rgba(56,189,248,0.2)', borderWidth: 1 },
  sendTitle: { fontSize: 16, fontWeight: '800', color: premium.text, marginBottom: 4 },
  sendHint: { fontSize: 12, color: premium.textMuted, marginBottom: 12 },
  input: {
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    borderRadius: 12,
    padding: 14,
    color: premium.text,
    fontSize: 14,
    marginBottom: 8,
  },
  confirmBtn: {
    backgroundColor: premium.accentBlue,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  // Tabs
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(148,163,184,0.06)',
  },
  tabActive: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  tabText: { fontSize: 12, fontWeight: '700', color: premium.textMuted },
  tabTextActive: { color: premium.accentBlue },
  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 13, color: premium.textMuted },
  // Request card
  reqCard: { marginBottom: 8 },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reqType: { fontSize: 11, fontWeight: '600', color: premium.textMuted },
  reqDate: { fontSize: 10, color: premium.textMuted },
  reqBody: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqName: { fontSize: 15, fontWeight: '700', color: premium.text },
  reqId: {
    fontSize: 11,
    fontWeight: '600',
    color: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reqMessage: { fontSize: 12, color: premium.textMuted, marginTop: 6, fontStyle: 'italic' },
  reqActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: premium.accentGreen },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
  statusBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  statusAccepted: { backgroundColor: 'rgba(34,197,94,0.08)' },
  statusRejected: { backgroundColor: 'rgba(239,68,68,0.08)' },
  statusText: { fontSize: 11, fontWeight: '700', color: premium.textMuted },
});
