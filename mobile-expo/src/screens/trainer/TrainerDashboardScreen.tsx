import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { apiJson } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';
import type { TrainerTabParamList } from '../../navigation/trainerTabTypes';

type DashboardData = {
  todayLessons: number;
  weeklyLessons: number;
  monthlyCompleted: number;
  monthlyCancelled: number;
  activeStudents: number;
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const res = await apiJson<DashboardData>('/trainer-panel/dashboard', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setData(res);
    } catch {
      // silent
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
