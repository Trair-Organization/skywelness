import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';

const TAB_BAR_PAD = 72;

type ClubEventRow = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  bookedCount: number;
  isJoined: boolean;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function MemberEventsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const [rows, setRows] = useState<ClubEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<ClubEventRow[]>('/events/upcoming?limit=50', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('events.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, tenant, t]);

  const toggleJoin = useCallback(
    async (row: ClubEventRow) => {
      if (!token || !tenant) {
        return;
      }
      setBusyId(row.id);
      setError(null);
      try {
        await apiJson(`/events/${row.id}/join`, {
          method: row.isJoined ? 'DELETE' : 'POST',
          token,
          tenantSubdomain: tenant.subdomain,
        });
        await load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('events.joinFailed'));
      } finally {
        setBusyId(null);
      }
    },
    [token, tenant, load, t],
  );

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + TAB_BAR_PAD },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>{t('tabs.events')}</Text>
        <Pressable
          style={styles.refreshBtn}
          onPress={() => load().catch(() => {})}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={premium.accentBlue} />
          ) : (
            <Text style={styles.refreshTxt}>{t('eventsTab.refresh')}</Text>
          )}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {rows.length === 0 && !loading ? (
          <GlassCard>
            <Text style={styles.muted}>{t('home.noUpcomingEvents')}</Text>
          </GlassCard>
        ) : null}
        {rows.map((r) => (
          <GlassCard key={r.id} style={styles.card}>
            {r.imageUrl ? (
              <Image source={{ uri: r.imageUrl }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePh]}>
                <Text style={styles.cardImagePhTxt}>{t('events.noImage')}</Text>
              </View>
            )}
            <View style={styles.rowTop}>
              <Text style={styles.cardTitle}>{r.title}</Text>
              {r.isJoined ? <Text style={styles.joinedBadge}>{t('eventsTab.joined')}</Text> : null}
            </View>
            <Text style={styles.line}>
              {t('events.locationLabel')}: {r.location || '-'}
            </Text>
            <Text style={styles.line}>
              {t('events.coachLabel')}: {r.coachName || '-'}
            </Text>
            <Text style={styles.line}>
              {t('events.dateLabel')}: {fmt(r.startsAt)}
            </Text>
            <Text style={styles.line}>
              {t('events.capacity', { booked: r.bookedCount, capacity: r.capacity })}
            </Text>
            {r.description ? <Text style={styles.muted}>{r.description}</Text> : null}
            <Pressable
              style={({ pressed }) => [
                r.isJoined ? styles.btnGhost : styles.btnPrimary,
                pressed && (r.isJoined ? styles.btnGhostPressed : styles.btnPrimaryPressed),
                busyId === r.id && styles.disabled,
              ]}
              onPress={() => toggleJoin(r).catch(() => {})}
              disabled={busyId === r.id}
            >
              {busyId === r.id ? (
                <ActivityIndicator color={r.isJoined ? premium.textMuted : '#fff'} />
              ) : (
                <Text style={r.isJoined ? styles.btnGhostTxt : styles.btnPrimaryTxt}>
                  {r.isJoined ? t('events.leave') : t('events.join')}
                </Text>
              )}
            </Pressable>
          </GlassCard>
        ))}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    flexGrow: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 16,
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.24)',
    borderRadius: premium.radiusSm,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshTxt: {
    color: premium.accentBlue,
    fontWeight: '700',
  },
  error: {
    color: '#fda4af',
    fontSize: 12,
    marginBottom: 8,
  },
  card: {
    marginBottom: 10,
  },
  cardImage: {
    width: '100%',
    height: 150,
    borderRadius: premium.radiusMd,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardImagePh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePhTxt: {
    color: premium.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
  },
  joinedBadge: {
    fontSize: 11,
    color: '#052e1b',
    backgroundColor: '#34d399',
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  line: {
    color: premium.text,
    fontSize: 13,
    marginBottom: 6,
  },
  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: premium.textMuted,
    marginBottom: 10,
  },
  btnPrimary: {
    backgroundColor: 'rgba(56,189,248,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.5)',
    borderRadius: premium.radiusSm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnPrimaryPressed: {
    backgroundColor: 'rgba(56,189,248,0.5)',
  },
  btnPrimaryTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  btnGhostPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnGhostTxt: {
    color: premium.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
});
