import { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';

type AvailSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
};
type Lesson = {
  id: string;
  startTime: string;
  endTime: string;
  studentName: string;
  studentId: string;
  type: string;
  status: string;
};
type Student = { userId: string; firstName: string; lastName: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(d: string, n: number) {
  const dt = new Date(`${d}T12:00:00`);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}
function dayLabel(d: string) {
  const dt = new Date(`${d}T12:00:00`);
  return { day: dt.toLocaleDateString('tr-TR', { weekday: 'short' }), num: dt.getDate() };
}

export function TrainerCalendarScreen() {
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [availabilities, setAvailabilities] = useState<AvailSlot[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add slot modal
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');

  // Add lesson modal
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [selectedAvailId, setSelectedAvailId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [lessonNote, setLessonNote] = useState('');

  const opts = useMemo(
    () => ({ token: token ?? undefined, tenantSubdomain: tenant?.subdomain }),
    [token, tenant],
  );

  const loadCalendar = useCallback(async () => {
    if (!token || !tenant) return;
    const from = selectedDate;
    const to = addDays(selectedDate, 1);
    try {
      const res = await apiJson<{ availabilities: AvailSlot[]; lessons: Lesson[] }>(
        `/trainer-panel/calendar?from=${from}&to=${to}`,
        opts,
      );
      setAvailabilities(res.availabilities.filter((a) => a.date === selectedDate));
      setLessons(res.lessons);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, tenant, selectedDate, opts]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadCalendar();
    }, [loadCalendar]),
  );

  const dateStrip = useMemo(() => {
    const today = todayISO();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i);
      const { day, num } = dayLabel(d);
      return { date: d, day, num, isToday: i === 0 };
    });
  }, []);

  const handleAddSlot = async () => {
    try {
      await apiJson('/trainer-panel/availability', {
        ...opts,
        method: 'POST',
        body: JSON.stringify({ date: selectedDate, startTime: newStartTime, endTime: newEndTime }),
      });
      setShowAddSlot(false);
      void loadCalendar();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Slot oluşturulamadı');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    Alert.alert('Slot Sil', 'Bu müsaitlik slotunu silmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiJson(`/trainer-panel/availability/${id}`, { ...opts, method: 'DELETE' });
            void loadCalendar();
          } catch (e) {
            Alert.alert('Hata', e instanceof ApiError ? e.message : 'Silinemedi');
          }
        },
      },
    ]);
  };

  const openAddLesson = async (availId: string) => {
    setSelectedAvailId(availId);
    setSelectedStudentId('');
    setLessonNote('');
    try {
      const s = await apiJson<Student[]>('/trainer-panel/students', opts);
      setStudents(s);
    } catch {
      setStudents([]);
    }
    setShowAddLesson(true);
  };

  const handleAddLesson = async () => {
    if (!selectedStudentId) {
      Alert.alert('Hata', 'Öğrenci seçin');
      return;
    }
    try {
      await apiJson('/trainer-panel/lessons', {
        ...opts,
        method: 'POST',
        body: JSON.stringify({
          availabilityId: selectedAvailId,
          studentUserId: selectedStudentId,
          notes: lessonNote,
        }),
      });
      setShowAddLesson(false);
      void loadCalendar();
      Alert.alert('✅', 'Ders oluşturuldu');
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Ders oluşturulamadı');
    }
  };

  const handleCancelLesson = (lessonId: string) => {
    Alert.alert('Ders İptal', 'Bu dersi iptal etmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiJson(`/trainer-panel/lessons/${lessonId}/cancel`, {
              ...opts,
              method: 'POST',
              body: JSON.stringify({}),
            });
            void loadCalendar();
          } catch (e) {
            Alert.alert('Hata', e instanceof ApiError ? e.message : 'İptal edilemedi');
          }
        },
      },
    ]);
  };

  // Determine which slots are occupied
  const occupiedSlots = new Set(lessons.map((l) => l.startTime.slice(11, 16)));

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
              void loadCalendar();
            }}
            tintColor={premium.accentBlue}
          />
        }
      >
        <Text style={styles.title}>📅 Takvim</Text>

        {/* Date Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStrip}
        >
          {dateStrip.map((d) => (
            <Pressable
              key={d.date}
              style={[styles.dateChip, d.date === selectedDate && styles.dateChipActive]}
              onPress={() => setSelectedDate(d.date)}
            >
              <Text
                style={[styles.dateChipDay, d.date === selectedDate && styles.dateChipDayActive]}
              >
                {d.day}
              </Text>
              <Text
                style={[styles.dateChipNum, d.date === selectedDate && styles.dateChipNumActive]}
              >
                {d.num}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Add Slot Button */}
        <Pressable style={styles.addBtn} onPress={() => setShowAddSlot(true)}>
          <Text style={styles.addBtnText}>+ Müsaitlik Ekle</Text>
        </Pressable>

        {/* Slots & Lessons */}
        <Text style={styles.sectionTitle}>Müsaitlik Slotları</Text>
        {availabilities.length === 0 && lessons.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>Bu gün için slot yok. Müsaitlik ekleyin.</Text>
          </GlassCard>
        ) : (
          <>
            {availabilities.map((slot) => {
              const hasLesson = occupiedSlots.has(slot.startTime.slice(0, 5));
              const lesson = lessons.find(
                (l) => l.startTime.slice(11, 16) === slot.startTime.slice(0, 5),
              );
              return (
                <GlassCard
                  key={slot.id}
                  style={[styles.slotCard, hasLesson && styles.slotCardOccupied]}
                >
                  <View style={styles.slotRow}>
                    <View>
                      <Text style={styles.slotTime}>
                        {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                      </Text>
                      {lesson ? (
                        <Text style={styles.slotStudent}>🏋️ {lesson.studentName}</Text>
                      ) : (
                        <Text style={styles.slotEmpty}>Müsait</Text>
                      )}
                    </View>
                    <View style={styles.slotActions}>
                      {lesson ? (
                        <Pressable
                          style={styles.cancelBtn}
                          onPress={() => handleCancelLesson(lesson.id)}
                        >
                          <Text style={styles.cancelBtnText}>İptal</Text>
                        </Pressable>
                      ) : (
                        <>
                          <Pressable
                            style={styles.lessonBtn}
                            onPress={() => openAddLesson(slot.id)}
                          >
                            <Text style={styles.lessonBtnText}>Ders Ekle</Text>
                          </Pressable>
                          <Pressable
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteSlot(slot.id)}
                          >
                            <Text style={styles.deleteBtnText}>🗑</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                </GlassCard>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Add Slot Modal */}
      <Modal visible={showAddSlot} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAddSlot(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Müsaitlik Ekle</Text>
            <Text style={styles.modalSub}>{selectedDate}</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Başlangıç</Text>
                <TextInput
                  style={styles.timeInput}
                  value={newStartTime}
                  onChangeText={setNewStartTime}
                  placeholder="09:00"
                  placeholderTextColor={premium.textMuted}
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Bitiş</Text>
                <TextInput
                  style={styles.timeInput}
                  value={newEndTime}
                  onChangeText={setNewEndTime}
                  placeholder="10:00"
                  placeholderTextColor={premium.textMuted}
                />
              </View>
            </View>
            <Pressable style={styles.modalBtn} onPress={handleAddSlot}>
              <Text style={styles.modalBtnText}>Oluştur</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal visible={showAddLesson} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAddLesson(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ders Ekle</Text>
            <Text style={styles.modalSub}>Öğrenci seçin</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {students.map((s) => (
                <Pressable
                  key={s.userId}
                  style={[
                    styles.studentOption,
                    selectedStudentId === s.userId && styles.studentOptionActive,
                  ]}
                  onPress={() => setSelectedStudentId(s.userId)}
                >
                  <Text style={styles.studentOptionText}>
                    {s.firstName} {s.lastName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              style={styles.noteInput}
              value={lessonNote}
              onChangeText={setLessonNote}
              placeholder="Not (opsiyonel)"
              placeholderTextColor={premium.textMuted}
              multiline
            />
            <Pressable
              style={[styles.modalBtn, !selectedStudentId && { opacity: 0.4 }]}
              onPress={handleAddLesson}
              disabled={!selectedStudentId}
            >
              <Text style={styles.modalBtnText}>Ders Oluştur</Text>
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
  title: { fontSize: 22, fontWeight: '800', color: premium.text, marginBottom: 12 },
  dateStrip: { gap: 8, marginBottom: 16 },
  dateChip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(148,163,184,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    minWidth: 48,
  },
  dateChipActive: { backgroundColor: premium.accentBlue, borderColor: premium.accentBlue },
  dateChipDay: {
    fontSize: 10,
    color: premium.textMuted,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateChipDayActive: { color: '#fff' },
  dateChipNum: { fontSize: 16, fontWeight: '900', color: premium.text, marginTop: 2 },
  dateChipNumActive: { color: '#fff' },
  addBtn: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: premium.accentBlue },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: premium.text, marginBottom: 10 },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: premium.textMuted, fontSize: 13 },
  slotCard: { marginBottom: 8 },
  slotCardOccupied: { borderColor: 'rgba(56,189,248,0.2)', borderWidth: 1 },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotTime: { fontSize: 16, fontWeight: '800', color: premium.text },
  slotStudent: { fontSize: 13, color: premium.accentBlue, marginTop: 2 },
  slotEmpty: { fontSize: 12, color: premium.accentGreen, marginTop: 2 },
  slotActions: { flexDirection: 'row', gap: 8 },
  lessonBtn: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lessonBtnText: { fontSize: 12, fontWeight: '700', color: premium.accentBlue },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  deleteBtnText: { fontSize: 16 },
  cancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
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
  timeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 12, fontWeight: '600', color: premium.textMuted, marginBottom: 6 },
  timeInput: {
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    borderRadius: 12,
    padding: 14,
    color: premium.text,
    fontSize: 16,
    fontWeight: '700',
  },
  modalBtn: {
    backgroundColor: premium.accentBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  studentOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    marginBottom: 6,
  },
  studentOptionActive: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  studentOptionText: { fontSize: 14, fontWeight: '600', color: premium.text },
  noteInput: {
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    borderRadius: 12,
    padding: 14,
    color: premium.text,
    fontSize: 14,
    minHeight: 60,
    marginTop: 12,
    textAlignVertical: 'top',
  },
});
