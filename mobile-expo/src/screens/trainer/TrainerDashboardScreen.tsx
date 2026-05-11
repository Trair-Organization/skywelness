import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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

type PendingRequest = {
  id: string;
  studentName: string;
  studentId: string;
  sessionType: string;
  startTime: string;
  endTime: string;
  createdAt: string;
};

type DashboardData = {
  todayLessons: number;
  weeklyLessons: number;
  monthlyCompleted: number;
  monthlyCancelled: number;
  activeStudents: number;
  pendingRequests: number;
  unreadMessages: number;
  nextLesson: { time: string; studentName: string } | null;
  todaySchedule: Array<{
    id: string;
    time: string;
    endTime: string;
    studentName: string;
    type: string;
    status: string;
  }>;
};

export function TrainerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, tenant } = useMemberAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TrainerTabParamList>>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const opts = { token: token ?? undefined, tenantSubdomain: tenant?.subdomain };

  const load = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const [res, reqs] = await Promise.all([
        apiJson<DashboardData>('/trainer-panel/dashboard', opts),
        apiJson<PendingRequest[]>('/trainer-panel/requests', opts),
      ]);
      setData(res);
      setRequests(reqs);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, tenant]);

  const handleApprove = async (id: string) => {
    try {
      await apiJson(`/trainer-panel/requests/${id}/approve`, { ...opts, method: 'POST' });
      Alert.alert('✅', 'Randevu onaylandı');
      void load();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Onaylanamadı');
    }
  };

  const handleReject = (id: string) => {
    Alert.alert('Reddet', 'Bu randevu talebini reddetmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiJson(`/trainer-panel/requests/${id}/reject`, {
              ...opts,
              method: 'POST',
              body: JSON.stringify({}),
            });
            Alert.alert('❌', 'Talep reddedildi');
            void load();
          } catch (e) {
            Alert.alert('Hata', e instanceof ApiError ? e.message : 'Reddedilemedi');
          }
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading && !refreshing) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
        </View>
      </GradientBackground>
    );
  }

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Merhaba, {user?.firstName} 👋</Text>
          <Text style={styles.subtitle}>Eğitmen Paneli</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{data?.todayLessons ?? 0}</Text>
            <Text style={styles.statLabel}>Bugün</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{data?.weeklyLessons ?? 0}</Text>
            <Text style={styles.statLabel}>Bu Hafta</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{data?.activeStudents ?? 0}</Text>
            <Text style={styles.statLabel}>Öğrenci</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{data?.unreadMessages ?? 0}</Text>
            <Text style={styles.statLabel}>Mesaj</Text>
          </GlassCard>
        </View>

        {/* Monthly Stats */}
        <GlassCard style={styles.monthlyCard}>
          <Text style={styles.monthlyTitle}>Bu Ay</Text>
          <View style={styles.monthlyRow}>
            <View style={styles.monthlyItem}>
              <Text style={[styles.monthlyValue, { color: premium.accentGreen }]}>
                {data?.monthlyCompleted ?? 0}
              </Text>
              <Text style={styles.monthlyLabel}>Tamamlanan</Text>
            </View>
            <View style={styles.monthlyItem}>
              <Text style={[styles.monthlyValue, { color: '#f59e0b' }]}>
                {data?.monthlyCancelled ?? 0}
              </Text>
              <Text style={styles.monthlyLabel}>İptal</Text>
            </View>
          </View>
        </GlassCard>

        {/* Pending Requests */}
        {requests.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>⏳ Bekleyen Talepler ({requests.length})</Text>
            {requests.map((req) => (
              <GlassCard key={req.id} style={styles.pendingCard}>
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingStudentName}>{req.studentName}</Text>
                  <Text style={styles.pendingTime}>
                    {new Date(req.startTime).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {fmtTime(req.startTime)}
                  </Text>
                  <Text style={styles.pendingType}>
                    {req.sessionType === 'personal_training' ? '🏋️ Özel Ders' : '💆 Masaj'}
                  </Text>
                </View>
                <View style={styles.pendingActions}>
                  <Pressable style={styles.approveBtn} onPress={() => handleApprove(req.id)}>
                    <Text style={styles.approveBtnText}>✓ Onayla</Text>
                  </Pressable>
                  <Pressable style={styles.rejectBtn} onPress={() => handleReject(req.id)}>
                    <Text style={styles.rejectBtnText}>✕ Reddet</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Next Lesson */}
        {data?.nextLesson && (
          <GlassCard style={styles.nextLessonCard}>
            <View style={styles.nextLessonHeader}>
              <Text style={styles.nextLessonIcon}>⏰</Text>
              <Text style={styles.nextLessonTitle}>Sıradaki Ders</Text>
            </View>
            <Text style={styles.nextLessonTime}>{fmtTime(data.nextLesson.time)}</Text>
            <Text style={styles.nextLessonStudent}>{data.nextLesson.studentName}</Text>
          </GlassCard>
        )}

        {/* Today Schedule */}
        {data?.todaySchedule && data.todaySchedule.length > 0 && (
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>Bugünkü Program</Text>
            {data.todaySchedule.map((lesson) => (
              <GlassCard key={lesson.id} style={styles.lessonCard}>
                <View style={styles.lessonRow}>
                  <View style={styles.lessonTimeBlock}>
                    <Text style={styles.lessonTime}>{fmtTime(lesson.time)}</Text>
                    <Text style={styles.lessonEndTime}>{fmtTime(lesson.endTime)}</Text>
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonStudent}>{lesson.studentName}</Text>
                    <Text style={styles.lessonType}>
                      {lesson.type === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.lessonStatus,
                      lesson.status === 'pending' && styles.lessonStatusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.lessonStatusText,
                        lesson.status === 'pending' && styles.lessonStatusTextPending,
                      ]}
                    >
                      {lesson.status === 'confirmed' ? '✓' : '⏳'}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('Calendar')}>
            <Text style={styles.quickBtnIcon}>📅</Text>
            <Text style={styles.quickBtnText}>Takvim</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('Students')}>
            <Text style={styles.quickBtnIcon}>👥</Text>
            <Text style={styles.quickBtnText}>Öğrenciler</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('TrainerMessages')}>
            <Text style={styles.quickBtnIcon}>💬</Text>
            <Text style={styles.quickBtnText}>Mesajlar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '900', color: premium.text },
  subtitle: { fontSize: 14, color: premium.textMuted, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 28, fontWeight: '900', color: premium.text },
  statLabel: { fontSize: 11, fontWeight: '600', color: premium.textMuted, marginTop: 4 },
  monthlyCard: { marginBottom: 16 },
  monthlyTitle: { fontSize: 16, fontWeight: '800', color: premium.text, marginBottom: 12 },
  monthlyRow: { flexDirection: 'row', gap: 20 },
  monthlyItem: { alignItems: 'center' },
  monthlyValue: { fontSize: 24, fontWeight: '900' },
  monthlyLabel: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  nextLessonCard: { marginBottom: 16, borderColor: 'rgba(56,189,248,0.2)', borderWidth: 1 },
  pendingCard: { marginBottom: 8, borderColor: 'rgba(245,158,11,0.2)', borderWidth: 1 },
  pendingInfo: { marginBottom: 10 },
  pendingStudentName: { fontSize: 15, fontWeight: '700', color: premium.text },
  pendingTime: { fontSize: 13, color: premium.accentBlue, marginTop: 2 },
  pendingType: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  pendingActions: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: premium.accentGreen },
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
  nextLessonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  nextLessonIcon: { fontSize: 18 },
  nextLessonTitle: { fontSize: 14, fontWeight: '700', color: premium.textMuted },
  nextLessonTime: { fontSize: 22, fontWeight: '900', color: premium.accentBlue },
  nextLessonStudent: { fontSize: 15, fontWeight: '600', color: premium.text, marginTop: 4 },
  scheduleSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: premium.text, marginBottom: 10 },
  lessonCard: { marginBottom: 8 },
  lessonRow: { flexDirection: 'row', alignItems: 'center' },
  lessonTimeBlock: { width: 60 },
  lessonTime: { fontSize: 14, fontWeight: '800', color: premium.accentBlue },
  lessonEndTime: { fontSize: 11, color: premium.textMuted },
  lessonInfo: { flex: 1, marginLeft: 12 },
  lessonStudent: { fontSize: 14, fontWeight: '700', color: premium.text },
  lessonType: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  lessonStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonStatusPending: { backgroundColor: 'rgba(245,158,11,0.12)' },
  lessonStatusText: { fontSize: 12, color: premium.accentGreen },
  lessonStatusTextPending: { color: '#f59e0b' },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(148,163,184,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  quickBtnIcon: { fontSize: 24, marginBottom: 6 },
  quickBtnText: { fontSize: 12, fontWeight: '700', color: premium.textMuted },
});
