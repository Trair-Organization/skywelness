import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { PremiumInput } from '../../components/premium/PremiumInput';
import { premium } from '../../theme/premiumTheme';

type LessonSessionType = 'personal_training' | 'massage';

type TrainerCandidate = {
  id: string;
  tenantId: string;
  isIndependent?: boolean;
  user: { firstName: string; lastName: string };
};
type LinkedTrainer = {
  linkId: string;
  trainerId: string;
  trainer: { firstName: string; lastName: string };
};
type StudentRow = {
  linkId: string;
  memberUserId: string;
  member: { firstName: string; lastName: string; email: string };
};
type NoteRow = {
  id: string;
  createdAt: string;
  note: string;
  trainerName?: string;
  memberName?: string;
};

export function MemberTrainerNetworkScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant, user } = useMemberAuth();
  const [loading, setLoading] = useState(false);
  const [allTrainers, setAllTrainers] = useState<TrainerCandidate[]>([]);
  const [myTrainers, setMyTrainers] = useState<LinkedTrainer[]>([]);
  const [myStudents, setMyStudents] = useState<StudentRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [trainerScope, setTrainerScope] = useState<'all' | 'club' | 'independent'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [lessonRequest, setLessonRequest] = useState<{
    trainerId: string;
    trainerName: string;
  } | null>(null);
  const [lessonSession, setLessonSession] = useState<LessonSessionType>('personal_training');
  const [lessonMessage, setLessonMessage] = useState('');
  const [lessonSubmitting, setLessonSubmitting] = useState(false);

  const isMember = user?.role === 'member';
  const isTrainer = user?.role === 'trainer' || user?.role === 'independent_trainer';

  const loadMemberData = useCallback(async () => {
    if (!token || !tenant) return;
    const [trainers, mine, myNotes] = await Promise.all([
      apiJson<TrainerCandidate[]>('/trainers', { token, tenantSubdomain: tenant.subdomain }),
      apiJson<LinkedTrainer[]>('/trainer-network/my-trainers', {
        token,
        tenantSubdomain: tenant.subdomain,
      }),
      apiJson<NoteRow[]>('/trainer-network/notes', { token, tenantSubdomain: tenant.subdomain }),
    ]);
    setAllTrainers(trainers);
    setMyTrainers(mine);
    setNotes(myNotes);
  }, [token, tenant]);

  const loadTrainerData = useCallback(async () => {
    if (!token || !tenant) return;
    const students = await apiJson<StudentRow[]>('/trainer-network/my-students', {
      token,
      tenantSubdomain: tenant.subdomain,
    });
    setMyStudents(students);
    const defaultStudentId = students[0]?.memberUserId ?? null;
    setSelectedStudentId(defaultStudentId);
    if (defaultStudentId) {
      const list = await apiJson<NoteRow[]>(
        `/trainer-network/notes?memberUserId=${encodeURIComponent(defaultStudentId)}`,
        { token, tenantSubdomain: tenant.subdomain },
      );
      setNotes(list);
    } else {
      setNotes([]);
    }
  }, [token, tenant]);

  const reload = useCallback(async () => {
    if (!token || !tenant || !user) return;
    setLoading(true);
    try {
      if (isMember) {
        await loadMemberData();
      } else if (isTrainer) {
        await loadTrainerData();
      }
    } catch (e) {
      Alert.alert(t('network.title'), e instanceof ApiError ? e.message : t('network.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, tenant, user, isMember, isTrainer, loadMemberData, loadTrainerData, t]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const connectable = useMemo(
    () => allTrainers.filter((tr) => !myTrainers.some((mt) => mt.trainerId === tr.id)),
    [allTrainers, myTrainers],
  );

  const visibleConnectable = useMemo(() => {
    if (!tenant) return connectable;
    if (trainerScope === 'club') {
      return connectable.filter((tr) => !tr.isIndependent && tr.tenantId === tenant.id);
    }
    if (trainerScope === 'independent') {
      return connectable.filter((tr) => tr.isIndependent);
    }
    return connectable;
  }, [connectable, tenant, trainerScope]);

  const connectTrainer = async () => {
    if (!token || !tenant || !selectedTrainerId) return;
    try {
      await apiJson('/trainer-network/connect', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({ trainerId: selectedTrainerId }),
      });
      setSelectedTrainerId(null);
      await reload();
      Alert.alert(t('network.title'), t('network.connectOk'));
    } catch (e) {
      Alert.alert(t('network.title'), e instanceof ApiError ? e.message : t('network.connectFail'));
    }
  };

  const pickStudent = async (memberUserId: string) => {
    if (!token || !tenant) return;
    setSelectedStudentId(memberUserId);
    try {
      const list = await apiJson<NoteRow[]>(
        `/trainer-network/notes?memberUserId=${encodeURIComponent(memberUserId)}`,
        { token, tenantSubdomain: tenant.subdomain },
      );
      setNotes(list);
    } catch (e) {
      Alert.alert(t('network.title'), e instanceof ApiError ? e.message : t('network.loadFailed'));
    }
  };

  const openLessonRequest = (trainerId: string, trainerName: string) => {
    setLessonRequest({ trainerId, trainerName });
    setLessonSession('personal_training');
    setLessonMessage('');
  };

  const closeLessonRequest = () => {
    if (lessonSubmitting) return;
    setLessonRequest(null);
  };

  const submitLessonRequest = async () => {
    if (!lessonRequest || !token || !tenant) return;
    setLessonSubmitting(true);
    try {
      await apiJson('/package-requests', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({
          sessionType: lessonSession,
          preferredTrainerId: lessonRequest.trainerId,
          message: lessonMessage.trim() || undefined,
        }),
      });
      setLessonRequest(null);
      setLessonMessage('');
      Alert.alert(t('network.requestLessonTitle'), t('network.requestOk'));
    } catch (e) {
      Alert.alert(
        t('network.requestLessonTitle'),
        e instanceof ApiError ? e.message : t('network.requestFail'),
      );
    } finally {
      setLessonSubmitting(false);
    }
  };

  const submitNote = async () => {
    if (!token || !tenant || !selectedStudentId || newNote.trim().length < 2) return;
    try {
      await apiJson('/trainer-network/student-note', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({ memberUserId: selectedStudentId, note: newNote.trim() }),
      });
      setNewNote('');
      await pickStudent(selectedStudentId);
    } catch (e) {
      Alert.alert(t('network.title'), e instanceof ApiError ? e.message : t('network.noteFail'));
    }
  };

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.root,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 86 },
        ]}
      >
        <Text style={styles.title}>{t('network.title')}</Text>
        {loading ? <ActivityIndicator color={premium.accentBlue} style={styles.loader} /> : null}

        {isMember ? (
          <>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>{t('network.myTrainers')}</Text>
              {myTrainers.length === 0 ? (
                <Text style={styles.muted}>{t('network.emptyTrainers')}</Text>
              ) : null}
              {myTrainers.map((tr) => {
                const fullName = `${tr.trainer.firstName} ${tr.trainer.lastName}`.trim();
                return (
                  <View key={tr.linkId} style={styles.row}>
                    <Text style={styles.rowTxt}>{fullName}</Text>
                    <Pressable
                      onPress={() => openLessonRequest(tr.trainerId, fullName)}
                      style={({ pressed }) => [
                        styles.lessonRequestPill,
                        pressed && styles.lessonRequestPillPressed,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.lessonRequestPillIcon}>🥇</Text>
                      <Text style={styles.lessonRequestPillTxt}>{t('network.requestLesson')}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>{t('network.connectTrainer')}</Text>
              <View style={styles.scopeRow}>
                {(['all', 'club', 'independent'] as const).map((scope) => {
                  const active = trainerScope === scope;
                  return (
                    <Pressable
                      key={scope}
                      style={[styles.scopeChip, active && styles.scopeChipOn]}
                      onPress={() => setTrainerScope(scope)}
                    >
                      <Text style={[styles.scopeChipTxt, active && styles.scopeChipTxtOn]}>
                        {t(`network.scope.${scope}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {visibleConnectable.map((tr) => {
                const selected = selectedTrainerId === tr.id;
                return (
                  <Pressable
                    key={tr.id}
                    style={[styles.pick, selected && styles.pickOn]}
                    onPress={() => setSelectedTrainerId(tr.id)}
                  >
                    <Text style={styles.pickTxt}>
                      {tr.user.firstName} {tr.user.lastName}
                    </Text>
                    <Text style={styles.pickMeta}>
                      {tr.isIndependent
                        ? t('network.tags.independent')
                        : t('network.tags.clubTrainer')}
                    </Text>
                  </Pressable>
                );
              })}
              {visibleConnectable.length === 0 ? (
                <Text style={styles.muted}>{t('network.emptyConnectable')}</Text>
              ) : null}
              <Pressable
                style={[styles.btn, !selectedTrainerId && styles.btnDisabled]}
                onPress={() => connectTrainer().catch(() => {})}
                disabled={!selectedTrainerId}
              >
                <Text style={styles.btnTxt}>{t('network.connectAction')}</Text>
              </Pressable>
            </GlassCard>
          </>
        ) : null}

        {isMember && allTrainers.length > 0 ? (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>{t('network.requestLessonTitle')}</Text>
            <Text style={styles.muted}>{t('network.requestLessonHint')}</Text>
            {allTrainers.map((tr) => {
              const fullName = `${tr.user.firstName} ${tr.user.lastName}`.trim();
              const trainerLabel = tr.isIndependent
                ? t('network.tags.independent')
                : t('network.tags.clubTrainer');
              return (
                <Pressable
                  key={`req-${tr.id}`}
                  style={({ pressed }) => [
                    styles.lessonTrainerRow,
                    pressed && styles.lessonTrainerRowPressed,
                  ]}
                  onPress={() => openLessonRequest(tr.id, fullName)}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTxt}>{fullName}</Text>
                    <Text style={styles.pickMeta}>{trainerLabel}</Text>
                  </View>
                  <Text style={styles.lessonTrainerArrow}>›</Text>
                </Pressable>
              );
            })}
          </GlassCard>
        ) : null}

        {isTrainer ? (
          <>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>{t('network.myStudents')}</Text>
              {myStudents.length === 0 ? (
                <Text style={styles.muted}>{t('network.emptyStudents')}</Text>
              ) : null}
              {myStudents.map((st) => {
                const selected = selectedStudentId === st.memberUserId;
                return (
                  <Pressable
                    key={st.linkId}
                    style={[styles.pick, selected && styles.pickOn]}
                    onPress={() => pickStudent(st.memberUserId).catch(() => {})}
                  >
                    <Text style={styles.pickTxt}>
                      {st.member.firstName} {st.member.lastName}
                    </Text>
                  </Pressable>
                );
              })}
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>{t('network.notes')}</Text>
              {notes.map((n) => (
                <View key={n.id} style={styles.note}>
                  <Text style={styles.noteTxt}>{n.note}</Text>
                  <Text style={styles.noteDate}>{new Date(n.createdAt).toLocaleString()}</Text>
                </View>
              ))}
              <PremiumInput
                label={t('network.newNote')}
                value={newNote}
                onChangeText={setNewNote}
                multiline
              />
              <Pressable
                style={[
                  styles.btn,
                  (!selectedStudentId || newNote.trim().length < 2) && styles.btnDisabled,
                ]}
                onPress={() => submitNote().catch(() => {})}
                disabled={!selectedStudentId || newNote.trim().length < 2}
              >
                <Text style={styles.btnTxt}>{t('network.addNote')}</Text>
              </Pressable>
            </GlassCard>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={!!lessonRequest}
        transparent
        animationType="fade"
        onRequestClose={closeLessonRequest}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeLessonRequest} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('network.requestLessonTitle')}</Text>
            {lessonRequest ? (
              <Text style={styles.modalSubtitle}>{lessonRequest.trainerName}</Text>
            ) : null}
            <Text style={styles.modalHint}>{t('network.requestLessonHint')}</Text>

            <Text style={styles.modalSectionLabel}>{t('network.requestSessionTypeLabel')}</Text>
            <View style={styles.lessonTypeRow}>
              {(
                [
                  {
                    id: 'personal_training',
                    label: t('network.requestSessionPersonal'),
                    icon: '💪',
                  },
                  { id: 'massage', label: t('network.requestSessionMassage'), icon: '💆' },
                ] as { id: LessonSessionType; label: string; icon: string }[]
              ).map((opt) => {
                const active = lessonSession === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setLessonSession(opt.id)}
                    style={({ pressed }) => [
                      styles.lessonTypeChip,
                      active && styles.lessonTypeChipActive,
                      pressed && styles.lessonTypeChipPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.lessonTypeIcon}>{opt.icon}</Text>
                    <Text
                      style={[styles.lessonTypeTxt, active && styles.lessonTypeTxtActive]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <PremiumInput
              label={t('network.requestMessageLabel')}
              placeholder={t('network.requestMessagePh')}
              value={lessonMessage}
              onChangeText={setLessonMessage}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && styles.modalCancelPressed]}
                onPress={closeLessonRequest}
                disabled={lessonSubmitting}
              >
                <Text style={styles.modalCancelTxt}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.modalConfirm,
                  pressed && styles.modalConfirmPressed,
                  lessonSubmitting && styles.btnDisabled,
                ]}
                onPress={() => submitLessonRequest().catch(() => {})}
                disabled={lessonSubmitting}
              >
                {lessonSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnTxt}>{t('network.requestSubmit')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },
  title: { color: premium.text, fontSize: 22, fontWeight: '800', marginBottom: 10 },
  loader: { marginVertical: 6 },
  card: { marginBottom: 12 },
  cardTitle: { color: premium.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  muted: { color: premium.textMuted, fontSize: 13, marginBottom: 8 },
  row: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowTxt: { color: premium.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  lessonRequestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.55)',
    backgroundColor: 'rgba(56,189,248,0.14)',
  },
  lessonRequestPillPressed: {
    backgroundColor: 'rgba(56,189,248,0.28)',
    transform: [{ scale: 0.97 }],
  },
  lessonRequestPillIcon: { fontSize: 14 },
  lessonRequestPillTxt: {
    color: premium.accentBlue,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  lessonTrainerRow: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lessonTrainerRowPressed: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderColor: 'rgba(56,189,248,0.45)',
  },
  lessonTrainerArrow: {
    color: premium.accentBlue,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 22,
  },
  pick: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 8,
  },
  pickOn: { borderColor: premium.accentGreen, backgroundColor: 'rgba(16,185,129,0.12)' },
  pickTxt: { color: premium.text, fontSize: 14, fontWeight: '600' },
  pickMeta: { color: premium.textMuted, fontSize: 12, marginTop: 4 },
  scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  scopeChip: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  scopeChipOn: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.18)',
  },
  scopeChipTxt: { color: premium.textMuted, fontSize: 12, fontWeight: '700' },
  scopeChipTxtOn: { color: premium.text, fontWeight: '800' },
  btn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: 'rgba(56,189,248,0.35)',
  },
  btnDisabled: { opacity: 0.5 },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  note: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  noteTxt: { color: premium.text, fontSize: 14, lineHeight: 20 },
  noteDate: { color: premium.textMuted, fontSize: 11, marginTop: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,8,18,0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(6,18,33,0.98)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  modalTitle: {
    color: premium.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: premium.accentBlue,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalHint: {
    color: premium.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalSectionLabel: {
    color: premium.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  lessonTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  lessonTypeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  lessonTypeChipActive: {
    borderColor: 'rgba(56,189,248,0.7)',
    backgroundColor: 'rgba(56,189,248,0.14)',
  },
  lessonTypeChipPressed: {
    transform: [{ scale: 0.97 }],
  },
  lessonTypeIcon: { fontSize: 18 },
  lessonTypeTxt: {
    color: premium.text,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  lessonTypeTxtActive: {
    color: premium.accentBlue,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalCancelTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirm: {
    flex: 1.4,
    backgroundColor: 'rgba(56,189,248,0.45)',
    borderColor: 'rgba(56,189,248,0.7)',
  },
  modalConfirmPressed: {
    backgroundColor: 'rgba(56,189,248,0.6)',
    transform: [{ scale: 0.98 }],
  },
});
