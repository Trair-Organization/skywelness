import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type ReservationRow = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  trainer: { user: { firstName: string; lastName: string } };
  timeSlot: { id: string; startTime: string; endTime: string };
  package: {
    remainingSessions: number;
    status: string;
    packageType?: { id: string; name: string; sessionType: string };
  };
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

const TAB_BAR_PAD = 72;

export function MemberReservationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setLoading(true);
    try {
      const list = await apiJson<ReservationRow[]>('/reservations?limit=50', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setRows(list);
    } catch (e) {
      Alert.alert(
        t('alerts.reservations'),
        e instanceof ApiError ? e.message : t('alerts.reservationsErr'),
      );
    } finally {
      setLoading(false);
    }
  }, [token, tenant, t]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  const cancelReservation = useCallback(
    async (id: string) => {
      if (!token || !tenant) {
        return;
      }
      setCancellingId(id);
      try {
        await apiJson(`/reservations/${id}/cancel`, {
          method: 'POST',
          token,
          tenantSubdomain: tenant.subdomain,
        });
        Alert.alert(t('booking.section'), t('booking.cancelled'));
        await load();
      } catch (e) {
        Alert.alert(
          t('booking.section'),
          e instanceof ApiError ? e.message : t('booking.cancelFailed'),
        );
      } finally {
        setCancellingId(null);
      }
    },
    [token, tenant, load, t],
  );

  if (!token || !tenant) {
    return null;
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + TAB_BAR_PAD },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>{t('tabs.reservations')}</Text>
        <Text style={styles.screenSub}>{t('reservations.subtitle')}</Text>

        <GlassCard style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
            onPress={() => {
              load().catch(() => {});
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={premium.accentGreen} />
            ) : (
              <Text style={styles.btnOutlineTxt}>{t('booking.refreshRes')}</Text>
            )}
          </Pressable>

          {rows.length === 0 && !loading ? (
            <Text style={styles.muted}>{t('reservations.empty')}</Text>
          ) : null}

          {rows.map((r) => {
            const canCancel =
              (r.status === 'confirmed' || r.status === 'pending') &&
              new Date(r.startTime) > new Date();
            return (
              <View key={r.id} style={styles.resRow}>
                <Text style={styles.resTxt}>
                  {fmt(r.startTime)} ·{' '}
                  {r.trainer
                    ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`
                    : (r.spaTherapist?.name ?? '')}{' '}
                  · {r.status}
                </Text>
                {canCancel ? (
                  <Pressable
                    style={styles.btnDanger}
                    disabled={cancellingId === r.id}
                    onPress={() => {
                      cancelReservation(r.id).catch(() => {});
                    }}
                  >
                    {cancellingId === r.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnDangerTxt}>{t('booking.cancel')}</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </GlassCard>
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
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 14,
    color: premium.textMuted,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  muted: {
    fontSize: 14,
    color: premium.textMuted,
    marginBottom: 12,
  },
  btnOutline: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  btnOutlinePressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnOutlineTxt: {
    color: premium.accentGreen,
    fontWeight: '700',
    fontSize: 15,
  },
  resRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  resTxt: {
    flex: 1,
    fontSize: 13,
    marginRight: 8,
    color: premium.text,
  },
  btnDanger: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(248,113,113,0.35)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.55)',
  },
  btnDangerTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
