import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';
import type { TrainerTabParamList } from '../../navigation/trainerTabTypes';

type StudentRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  source: string;
  connectedAt: string;
  lastLessonAt: string | null;
};

export function TrainerStudentsScreen() {
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TrainerTabParamList>>();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Add external student modal
  const [showAdd, setShowAdd] = useState(false);
  const [extFirstName, setExtFirstName] = useState('');
  const [extLastName, setExtLastName] = useState('');
  const [extEmail, setExtEmail] = useState('');
  const [extPhone, setExtPhone] = useState('');
  const [adding, setAdding] = useState(false);

  const opts = { token: token ?? undefined, tenantSubdomain: tenant?.subdomain };

  const load = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const res = await apiJson<StudentRow[]>('/trainer-panel/students', opts);
      setStudents(res);
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

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  });

  const handleAddExternal = async () => {
    if (!extFirstName.trim() || !extLastName.trim() || !extEmail.trim() || !extPhone.trim()) {
      Alert.alert('Hata', 'Tüm alanları doldurun');
      return;
    }
    setAdding(true);
    try {
      await apiJson('/trainer-panel/students/add-external', {
        ...opts,
        method: 'POST',
        body: JSON.stringify({
          firstName: extFirstName,
          lastName: extLastName,
          email: extEmail,
          phone: extPhone,
        }),
      });
      setShowAdd(false);
      setExtFirstName('');
      setExtLastName('');
      setExtEmail('');
      setExtPhone('');
      Alert.alert('✅', 'Öğrenci eklendi');
      void load();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Eklenemedi');
    } finally {
      setAdding(false);
    }
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

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
          <Text style={styles.title}>👥 Öğrencilerim</Text>
          <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Ekle</Text>
          </Pressable>
        </View>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Öğrenci ara..."
          placeholderTextColor={premium.textMuted}
        />

        {/* List */}
        {filtered.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>Henüz öğrenciniz yok</Text>
            <Text style={styles.emptyDesc}>
              Dış öğrenci ekleyebilir veya üyelerin size bağlanmasını bekleyebilirsiniz.
            </Text>
          </GlassCard>
        ) : (
          filtered.map((s) => (
            <Pressable
              key={s.userId}
              onPress={() => navigation.navigate('StudentDetail', { userId: s.userId })}
            >
              <GlassCard style={styles.studentCard}>
                <View style={styles.studentRow}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentInitials}>
                      {s.firstName[0]}
                      {s.lastName[0]}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>
                      {s.firstName} {s.lastName}
                    </Text>
                    <Text style={styles.studentMeta}>
                      {s.source === 'trainer_added' ? '📎 Dış öğrenci' : '🏢 Kulüp üyesi'} · Son
                      ders: {fmtDate(s.lastLessonAt)}
                    </Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </GlassCard>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Add External Student Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAdd(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Dış Öğrenci Ekle</Text>
            <Text style={styles.modalSub}>Kulüp üyesi olmayan bir öğrenci ekleyin</Text>
            <TextInput
              style={styles.input}
              value={extFirstName}
              onChangeText={setExtFirstName}
              placeholder="Ad"
              placeholderTextColor={premium.textMuted}
            />
            <TextInput
              style={styles.input}
              value={extLastName}
              onChangeText={setExtLastName}
              placeholder="Soyad"
              placeholderTextColor={premium.textMuted}
            />
            <TextInput
              style={styles.input}
              value={extEmail}
              onChangeText={setExtEmail}
              placeholder="E-posta"
              placeholderTextColor={premium.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={extPhone}
              onChangeText={setExtPhone}
              placeholder="Telefon"
              placeholderTextColor={premium.textMuted}
              keyboardType="phone-pad"
            />
            <Pressable
              style={[styles.modalBtn, adding && { opacity: 0.5 }]}
              onPress={handleAddExternal}
              disabled={adding}
            >
              <Text style={styles.modalBtnText}>
                {adding ? '⏳ Ekleniyor...' : '✓ Öğrenci Ekle'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: premium.accentBlue },
  searchInput: {
    backgroundColor: 'rgba(148,163,184,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    borderRadius: 12,
    padding: 12,
    color: premium.text,
    fontSize: 14,
    marginBottom: 16,
  },
  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: premium.text },
  emptyDesc: {
    fontSize: 13,
    color: premium.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  studentCard: { marginBottom: 8 },
  studentRow: { flexDirection: 'row', alignItems: 'center' },
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  studentInitials: { color: premium.accentBlue, fontSize: 14, fontWeight: '800' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: premium.text },
  studentMeta: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  arrow: { fontSize: 20, color: premium.textMuted },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: premium.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: premium.textMuted, marginBottom: 16 },
  input: {
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    borderRadius: 12,
    padding: 14,
    color: premium.text,
    fontSize: 14,
    marginBottom: 10,
  },
  modalBtn: {
    backgroundColor: premium.accentBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
