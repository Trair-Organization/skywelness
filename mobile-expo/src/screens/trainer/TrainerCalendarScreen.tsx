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
  return {
    day: dt.toLocaleDateString('tr-TR', { weekday: 'short' }),
    num: dt.getDate(),
    month: dt.toLocaleDateString('tr-TR', { month: 'short' }),
  };
}

// Saatlik slot grid (08:00 - 22:00)
const HOUR_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 8;
  return {
    hour: h,
    label: `${h.toString().padStart(2, '0')}:00`,
    endLabel: `${(h + 1).toString().padStart(2, '0')}:00`,
  };
});

export function TrainerCalendarScreen() {
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [availabilities, setAvailabilities] = useState<AvailSlot[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Slot detail modal
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [showSlotModal, setShowSlotModal] = useState(false);

  // Add lesson modal
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [lessonNote, setLessonNote] = useState('');
  const [targetAvailId, setTargetAvailId] = useState('');

  // Reschedule
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleLesson, setRescheduleLesson] = useState<Lesson | null>(null);
  const [emptySlots, setEmptySlots] = useState<AvailSlot[]>([]);

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

  // Map: hour -> availability slot
  const availByHour = useMemo(() => {
    const map = new Map<number, AvailSlot>();
    for (const a of availabilities) {
      const h = parseInt(a.startTime.slice(0, 2), 10);
      map.set(h, a);
    }
    return map;
  }, [availabilities]);

  // Map: hour -> lesson
  const lessonByHour = useMemo(() => {
    const map = new Map<number, Lesson>();
    for (const l of lessons) {
      const h = new Date(l.startTime).getUTCHours();
      map.set(h, l);
    }
    return map;
  }, [lessons]);

  const getSlotStatus = (hour: number): 'empty' | 'available' | 'booked' => {
    if (lessonByHour.has(hour)) return 'booked';
    if (availByHour.has(hour)) return 'available';
    return 'empty';
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleSlotPress = (hour: number) => {
    setSelectedHour(hour);
    setShowSlotModal(true);
  };

  const handleOpenSlot = async (hour: number) => {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    try {
      await apiJson('/trainer-panel/availability', {
        ...opts,
        method: 'POST',
        body: JSON.stringify({ date: selectedDate, startTime, endTime }),
      });
      setShowSlotModal(false);
      void loadCalendar();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Slot açılamadı');
    }
  };

  const handleCloseSlot = async (hour: number) => {
    const avail = availByHour.get(hour);
    if (!avail) return;
    try {
      await apiJson(`/trainer-panel/availability/${avail.id}`, { ...opts, method: 'DELETE' });
      setShowSlotModal(false);
      void loadCalendar();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Slot kapatılamadı');
    }
  };

  const openAddLesson = async (hour: number) => {
    const avail = availByHour.get(hour);
    if (!avail) return;
    setTargetAvailId(avail.id);
    setSelectedStudentId('');
    setLessonNote('');
    setShowSlotModal(false);
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
          availabilityId: targetAvailId,
          studentUserId: selectedStudentId,
          notes: lessonNote,
        }),
      });
      setShowAddLesson(false);
      Alert.alert('✅', 'Ders oluşturuldu');
      void loadCalendar();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Ders oluşturulamadı');
    }
  };

  const handleCancelLesson = async (hour: number) => {
    const lesson = lessonByHour.get(hour);
    if (!lesson) return;
    setShowSlotModal(false);
    Alert.alert('Ders İptal', `${lesson.studentName} ile dersi iptal etmek istiyor musunuz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiJson(`/trainer-panel/lessons/${lesson.id}/cancel`, {
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

  const handleReschedule = async (hour: number) => {
    const lesson = lessonByHour.get(hour);
    if (!lesson) return;
    setRescheduleLesson(lesson);
    setShowSlotModal(false);
    // Load empty slots for next 14 days
    const from = todayISO();
    const to = addDays(from, 14);
    try {
      const res = await apiJson<{ availabilities: AvailSlot[]; lessons: Lesson[] }>(
        `/trainer-panel/calendar?from=${from}&to=${to}`,
        opts,
      );
      const lessonTimes = new Set(
        res.lessons.map(
          (l) => `${l.startTime.slice(0, 10)}|${new Date(l.startTime).getUTCHours()}`,
        ),
      );
      const empty = res.availabilities.filter((a) => {
        const h = parseInt(a.startTime.slice(0, 2), 10);
        return !lessonTimes.has(`${a.date}|${h}`);
      });
      setEmptySlots(empty.slice(0, 20));
      setShowReschedule(true);
    } catch {
      Alert.alert('Hata', 'Slotlar yüklenemedi');
    }
  };

  const handleRescheduleConfirm = async (newAvailId: string) => {
    if (!rescheduleLesson) return;
    try {
      await apiJson(`/trainer-panel/lessons/${rescheduleLesson.id}/reschedule`, {
        ...opts,
        method: 'POST',
        body: JSON.stringify({ newAvailabilityId: newAvailId }),
      });
      setShowReschedule(false);
      Alert.alert('✅', 'Ders yeni tarihe taşındı');
      void loadCalendar();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Taşınamadı');
    }
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
              void loadCalendar();
            }}
            tintColor={premium.accentBlue}
          />
        }
      >
        <Text style={styles.title}>📅 Ajanda</Text>
        <Text style={styles.subtitle}>Günlük programınızı yönetin</Text>

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

        {/* Hour Grid */}
        <View style={styles.grid}>
          {HOUR_SLOTS.map(({ hour, label, endLabel }) => {
            const status = getSlotStatus(hour);
            const lesson = lessonByHour.get(hour);
            return (
              <Pressable
                key={hour}
                style={[
                  styles.hourRow,
                  status === 'booked' && styles.hourRowBooked,
                  status === 'available' && styles.hourRowAvailable,
                ]}
                onPress={() => handleSlotPress(hour)}
              >
                <View style={styles.hourLabel}>
                  <Text style={styles.hourText}>{label}</Text>
                  <Text style={styles.hourEndText}>{endLabel}</Text>
                </View>
                <View style={styles.hourContent}>
                  {status === 'booked' && lesson ? (
                    <View style={styles.lessonInfo}>
                      <Text style={styles.lessonName}>🏋️ {lesson.studentName}</Text>
                      <Text style={styles.lessonType}>
                        {lesson.type === 'personal_training' ? 'Özel Ders' : lesson.type}
                      </Text>
                    </View>
                  ) : status === 'available' ? (
                    <Text style={styles.availableText}>✓ Müsait</Text>
                  ) : (
                    <Text style={styles.emptyText}>—</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.statusDot,
                    status === 'booked' && styles.statusDotBooked,
                    status === 'available' && styles.statusDotAvailable,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: premium.accentBlue }]} />
            <Text style={styles.legendText}>Dolu</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: premium.accentGreen }]} />
            <Text style={styles.legendText}>Müsait</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(148,163,184,0.3)' }]} />
            <Text style={styles.legendText}>Kapalı</Text>
          </View>
        </View>
      </ScrollView>

      {/* ═══ Slot Detail Modal ═══ */}
      <Modal visible={showSlotModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowSlotModal(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            {selectedHour !== null &&
              (() => {
                const status = getSlotStatus(selectedHour);
                const lesson = lessonByHour.get(selectedHour);
                const timeLabel = `${selectedHour.toString().padStart(2, '0')}:00 - ${(selectedHour + 1).toString().padStart(2, '0')}:00`;
                return (
                  <>
                    <Text style={styles.modalTitle}>{timeLabel}</Text>
                    <Text style={styles.modalDate}>
                      {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        weekday: 'long',
                      })}
                    </Text>

                    {status === 'booked' && lesson && (
                      <GlassCard style={styles.modalLessonCard}>
                        <Text style={styles.modalLessonName}>🏋️ {lesson.studentName}</Text>
                        <Text style={styles.modalLessonType}>
                          {lesson.type === 'personal_training' ? 'Özel Ders' : lesson.type} ·{' '}
                          {lesson.status === 'confirmed' ? '✓ Onaylı' : '⏳ Bekliyor'}
                        </Text>
                      </GlassCard>
                    )}

                    <View style={styles.modalActions}>
                      {status === 'empty' && (
                        <Pressable
                          style={styles.modalActionBtn}
                          onPress={() => handleOpenSlot(selectedHour)}
                        >
                          <Text style={styles.modalActionIcon}>🟢</Text>
                          <Text style={styles.modalActionText}>Rezervasyona Aç</Text>
                        </Pressable>
                      )}
                      {status === 'available' && (
                        <>
                          <Pressable
                            style={styles.modalActionBtn}
                            onPress={() => openAddLesson(selectedHour)}
                          >
                            <Text style={styles.modalActionIcon}>➕</Text>
                            <Text style={styles.modalActionText}>Kayıt Ekle</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.modalActionBtn, styles.modalActionBtnDanger]}
                            onPress={() => handleCloseSlot(selectedHour)}
                          >
                            <Text style={styles.modalActionIcon}>🔴</Text>
                            <Text style={styles.modalActionTextDanger}>Slotu Kapat</Text>
                          </Pressable>
                        </>
                      )}
                      {status === 'booked' && (
                        <>
                          <Pressable
                            style={styles.modalActionBtn}
                            onPress={() => handleReschedule(selectedHour)}
                          >
                            <Text style={styles.modalActionIcon}>📅</Text>
                            <Text style={styles.modalActionText}>İleri Tarihe Al</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.modalActionBtn, styles.modalActionBtnDanger]}
                            onPress={() => handleCancelLesson(selectedHour)}
                          >
                            <Text style={styles.modalActionIcon}>❌</Text>
                            <Text style={styles.modalActionTextDanger}>Rezervasyon İptal</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </>
                );
              })()}
          </View>
        </View>
      </Modal>

      {/* ═══ Add Lesson Modal ═══ */}
      <Modal visible={showAddLesson} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAddLesson(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Kayıt Ekle</Text>
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
              {students.length === 0 && (
                <Text style={styles.emptyListText}>Henüz öğrenciniz yok</Text>
              )}
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
              style={[styles.confirmBtn, !selectedStudentId && { opacity: 0.4 }]}
              onPress={handleAddLesson}
              disabled={!selectedStudentId}
            >
              <Text style={styles.confirmBtnText}>✓ Ders Oluştur</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ═══ Reschedule Modal ═══ */}
      <Modal visible={showReschedule} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowReschedule(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>İleri Tarihe Al</Text>
            <Text style={styles.modalSub}>{rescheduleLesson?.studentName} — yeni slot seçin</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {emptySlots.map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.rescheduleOption}
                  onPress={() => handleRescheduleConfirm(s.id)}
                >
                  <Text style={styles.rescheduleDate}>
                    {new Date(`${s.date}T12:00:00`).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      weekday: 'short',
                    })}
                  </Text>
                  <Text style={styles.rescheduleTime}>
                    {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
                  </Text>
                </Pressable>
              ))}
              {emptySlots.length === 0 && (
                <Text style={styles.emptyListText}>
                  Müsait slot bulunamadı. Önce yeni slot açın.
                </Text>
              )}
            </ScrollView>
            <Pressable style={styles.cancelModalBtn} onPress={() => setShowReschedule(false)}>
              <Text style={styles.cancelModalBtnText}>Vazgeç</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, maxWidth: 480, alignSelf: 'center', width: '100%' },
  title: { fontSize: 22, fontWeight: '800', color: premium.text },
  subtitle: { fontSize: 13, color: premium.textMuted, marginTop: 4, marginBottom: 12 },

  // Date Strip
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

  // Hour Grid
  grid: { gap: 2 },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(148,163,184,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.06)',
  },
  hourRowBooked: { backgroundColor: 'rgba(56,189,248,0.06)', borderColor: 'rgba(56,189,248,0.15)' },
  hourRowAvailable: {
    backgroundColor: 'rgba(34,197,94,0.04)',
    borderColor: 'rgba(34,197,94,0.12)',
  },
  hourLabel: { width: 50 },
  hourText: { fontSize: 13, fontWeight: '700', color: premium.text },
  hourEndText: { fontSize: 10, color: premium.textMuted },
  hourContent: { flex: 1, marginLeft: 12 },
  lessonInfo: {},
  lessonName: { fontSize: 14, fontWeight: '700', color: premium.text },
  lessonType: { fontSize: 11, color: premium.textMuted, marginTop: 1 },
  availableText: { fontSize: 13, fontWeight: '600', color: premium.accentGreen },
  emptyText: { fontSize: 13, color: 'rgba(148,163,184,0.4)' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(148,163,184,0.2)' },
  statusDotBooked: { backgroundColor: premium.accentBlue },
  statusDotAvailable: { backgroundColor: premium.accentGreen },

  // Legend
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: premium.textMuted },

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
  modalDate: {
    fontSize: 13,
    color: premium.textMuted,
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  modalSub: { fontSize: 13, color: premium.textMuted, marginBottom: 12 },
  modalLessonCard: { marginBottom: 16 },
  modalLessonName: { fontSize: 16, fontWeight: '700', color: premium.text },
  modalLessonType: { fontSize: 12, color: premium.textMuted, marginTop: 4 },
  modalActions: { gap: 8 },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(148,163,184,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  modalActionBtnDanger: {
    borderColor: 'rgba(239,68,68,0.2)',
    backgroundColor: 'rgba(239,68,68,0.04)',
  },
  modalActionIcon: { fontSize: 20 },
  modalActionText: { fontSize: 15, fontWeight: '700', color: premium.text },
  modalActionTextDanger: { fontSize: 15, fontWeight: '700', color: '#ef4444' },

  // Add Lesson
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
    minHeight: 50,
    marginTop: 12,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    backgroundColor: premium.accentBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  emptyListText: {
    fontSize: 13,
    color: premium.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Reschedule
  rescheduleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    marginBottom: 6,
  },
  rescheduleDate: {
    fontSize: 14,
    fontWeight: '600',
    color: premium.text,
    textTransform: 'capitalize',
  },
  rescheduleTime: { fontSize: 14, fontWeight: '700', color: premium.accentBlue },
  cancelModalBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(148,163,184,0.08)',
    marginTop: 12,
  },
  cancelModalBtnText: { fontSize: 15, fontWeight: '600', color: premium.textMuted },
});
