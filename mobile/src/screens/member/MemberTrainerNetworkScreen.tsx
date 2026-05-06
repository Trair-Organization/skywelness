import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
              {myTrainers.map((tr) => (
                <View key={tr.linkId} style={styles.row}>
                  <Text style={styles.rowTxt}>
                    {tr.trainer.firstName} {tr.trainer.lastName}
                  </Text>
                </View>
              ))}
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
  },
  rowTxt: { color: premium.text, fontSize: 14, fontWeight: '600' },
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
});
