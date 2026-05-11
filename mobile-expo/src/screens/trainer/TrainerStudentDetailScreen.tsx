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
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';
import type { TrainerTabParamList } from '../../navigation/trainerTabTypes';

type StudentDetail = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  source: string;
  connectedAt: string;
  totalLessons: number;
  notes: Array<{ id: string; note: string; createdAt: string }>;
  packages: Array<{ id: string; name: string; remainingSessions: number; expiresAt: string }>;
};

type HistoryRow = { id: string; startTime: string; endTime: string; type: string; status: string };

export function TrainerStudentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TrainerTabParamList>>();
  const route = useRoute<RouteProp<TrainerTabParamList, 'StudentDetail'>>();
  const { userId } = route.params;

  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'notes' | 'history'>('info');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const opts = { token: token ?? undefined, tenantSubdomain: tenant?.subdomain };

  const load = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const [d, h] = await Promise.all([
        apiJson<StudentDetail>(`/trainer-panel/students/${userId}`, opts),
        apiJson<HistoryRow[]>(`/trainer-panel/students/${userId}/history`, opts),
      ]);
      setDetail(d);
      setHistory(h);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [token, tenant, userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await apiJson(`/trainer-panel/students/${userId}/notes`, {
        ...opts,
        method: 'POST',
        body: JSON.stringify({ note: newNote }),
      });
      setNewNote('');
      void load();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Not eklenemedi');
    } finally {
      setAddingNote(false);
    }
  };

  const handleMessage = async () => {
    if (!token || !tenant || !detail) return;
    try {
      const res = await apiJson<{ conversationId: string }>('/messages/conversations', {
        ...opts,
        method: 'POST',
        body: JSON.stringify({ otherUserId: userId }),
      });
      navigation.navigate('Chat', {
        conversationId: res.conversationId,
        otherUser: {
          id: userId,
          firstName: detail.firstName,
          lastName: detail.lastName,
          photoUrl: detail.photoUrl,
        },
      });
    } catch {
      Alert.alert('Hata', 'Mesaj başlatılamadı');
    }
  };

  const handleArchive = () => {
    Alert.alert('Öğrenci Arşivle', 'Bu öğrenciyi arşivlemek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Arşivle',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiJson(`/trainer-panel/students/${userId}`, { ...opts, method: 'DELETE' });
            navigation.goBack();
          } catch (e) {
            Alert.alert('Hata', e instanceof ApiError ? e.message : 'Arşivlenemedi');
          }
        },
      },
    ]);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
        </View>
      </GradientBackground>
    );
  }

  if (!detail) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
          <Text style={{ color: premium.textMuted }}>Öğrenci bulunamadı</Text>
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
      >
        {/* Back */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Geri</Text>
        </Pressable>

        {/* Header */}
        <GlassCard style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {detail.firstName[0]}
              {detail.lastName[0]}
            </Text>
          </View>
          <Text style={styles.name}>
            {detail.firstName} {detail.lastName}
          </Text>
          <Text style={styles.meta}>
            {detail.email} · {detail.phone ?? '—'}
          </Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {detail.source === 'trainer_added' ? '📎 Dış' : '🏢 Kulüp'}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🏋️ {detail.totalLessons} ders</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={handleMessage}>
              <Text style={styles.actionBtnText}>💬 Mesaj</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleArchive}>
              <Text style={styles.actionBtnTextDanger}>Arşivle</Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Packages */}
        {detail.packages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paketler</Text>
            {detail.packages.map((p) => (
              <GlassCard key={p.id} style={styles.packageCard}>
                <View style={styles.packageRow}>
                  <Text style={styles.packageName}>{p.name}</Text>
                  <Text
                    style={[
                      styles.packageRemaining,
                      p.remainingSessions <= 2 && { color: '#f59e0b' },
                    ]}
                  >
                    {p.remainingSessions} kalan
                  </Text>
                </View>
                <Text style={styles.packageExpiry}>Son: {fmtDate(p.expiresAt)}</Text>
              </GlassCard>
            ))}
          </View>
        )}
        {detail.packages.length === 0 && (
          <GlassCard style={styles.noPackage}>
            <Text style={styles.noPackageText}>Aktif paket bulunmuyor</Text>
          </GlassCard>
        )}

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabBtn, tab === 'info' && styles.tabBtnActive]}
            onPress={() => setTab('info')}
          >
            <Text style={[styles.tabBtnText, tab === 'info' && styles.tabBtnTextActive]}>
              Bilgi
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === 'notes' && styles.tabBtnActive]}
            onPress={() => setTab('notes')}
          >
            <Text style={[styles.tabBtnText, tab === 'notes' && styles.tabBtnTextActive]}>
              Notlar
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
            onPress={() => setTab('history')}
          >
            <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>
              Geçmiş
            </Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        {tab === 'notes' && (
          <View>
            <View style={styles.noteInputRow}>
              <TextInput
                style={styles.noteInput}
                value={newNote}
                onChangeText={setNewNote}
                placeholder="Not ekle..."
                placeholderTextColor={premium.textMuted}
                multiline
              />
              <Pressable
                style={[styles.noteAddBtn, (!newNote.trim() || addingNote) && { opacity: 0.4 }]}
                onPress={handleAddNote}
                disabled={!newNote.trim() || addingNote}
              >
                <Text style={styles.noteAddBtnText}>+</Text>
              </Pressable>
            </View>
            {detail.notes.map((n) => (
              <GlassCard key={n.id} style={styles.noteCard}>
                <Text style={styles.noteText}>{n.note}</Text>
                <Text style={styles.noteDate}>{fmtDate(n.createdAt)}</Text>
              </GlassCard>
            ))}
            {detail.notes.length === 0 && <Text style={styles.emptyText}>Henüz not yok</Text>}
          </View>
        )}

        {tab === 'history' && (
          <View>
            {history.map((h) => (
              <GlassCard key={h.id} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <View>
                    <Text style={styles.historyDate}>
                      {fmtDate(h.startTime)} · {fmtTime(h.startTime)}
                    </Text>
                    <Text style={styles.historyType}>
                      {h.type === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.historyStatus,
                      h.status === 'cancelled' && styles.historyStatusCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyStatusText,
                        h.status === 'cancelled' && styles.historyStatusTextCancelled,
                      ]}
                    >
                      {h.status === 'confirmed' || h.status === 'completed'
                        ? 'Tamamlandı'
                        : h.status === 'cancelled'
                          ? 'İptal'
                          : h.status}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
            {history.length === 0 && <Text style={styles.emptyText}>Geçmiş ders yok</Text>}
          </View>
        )}

        {tab === 'info' && (
          <GlassCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-posta</Text>
              <Text style={styles.infoValue}>{detail.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefon</Text>
              <Text style={styles.infoValue}>{detail.phone ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bağlantı</Text>
              <Text style={styles.infoValue}>{fmtDate(detail.connectedAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kaynak</Text>
              <Text style={styles.infoValue}>
                {detail.source === 'trainer_added' ? 'Eğitmen ekledi' : 'Üye bağlandı'}
              </Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },
  backBtn: { marginBottom: 12 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: premium.accentBlue },
  headerCard: { alignItems: 'center', paddingVertical: 20, marginBottom: 12 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: premium.accentBlue },
  name: { fontSize: 20, fontWeight: '800', color: premium.text },
  meta: { fontSize: 12, color: premium.textMuted, marginTop: 4 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: {
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: premium.textMuted },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: premium.accentBlue },
  actionBtnDanger: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' },
  actionBtnTextDanger: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: premium.text, marginBottom: 8 },
  packageCard: { marginBottom: 6 },
  packageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packageName: { fontSize: 14, fontWeight: '700', color: premium.text },
  packageRemaining: { fontSize: 14, fontWeight: '800', color: premium.accentGreen },
  packageExpiry: { fontSize: 11, color: premium.textMuted, marginTop: 4 },
  noPackage: { marginBottom: 12, alignItems: 'center', paddingVertical: 16 },
  noPackageText: { fontSize: 13, color: '#f59e0b' },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(148,163,184,0.06)',
  },
  tabBtnActive: { backgroundColor: 'rgba(56,189,248,0.12)' },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: premium.textMuted },
  tabBtnTextActive: { color: premium.accentBlue },
  noteInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  noteInput: {
    flex: 1,
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    borderRadius: 12,
    padding: 12,
    color: premium.text,
    fontSize: 14,
    minHeight: 44,
  },
  noteAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: premium.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteAddBtnText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  noteCard: { marginBottom: 8 },
  noteText: { fontSize: 14, color: premium.text, lineHeight: 20 },
  noteDate: { fontSize: 11, color: premium.textMuted, marginTop: 6 },
  emptyText: { fontSize: 13, color: premium.textMuted, textAlign: 'center', paddingVertical: 20 },
  historyCard: { marginBottom: 6 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: 13, fontWeight: '600', color: premium.text },
  historyType: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  historyStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  historyStatusCancelled: { backgroundColor: 'rgba(239,68,68,0.08)' },
  historyStatusText: { fontSize: 11, fontWeight: '700', color: premium.accentGreen },
  historyStatusTextCancelled: { color: '#ef4444' },
  infoCard: { marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(148,163,184,0.1)',
  },
  infoLabel: { fontSize: 13, color: premium.textMuted },
  infoValue: { fontSize: 13, fontWeight: '600', color: premium.text },
});
