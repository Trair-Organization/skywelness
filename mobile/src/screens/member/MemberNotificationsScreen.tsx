import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export function MemberNotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !tenant) {
      return;
    }
    setLoading(true);
    try {
      const rows = await apiJson<NotificationRow[]>('/notifications?limit=100', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setItems(rows);
    } catch {
      Alert.alert(t('alerts.generic'), t('notifications.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, tenant, t]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token || !tenant) {
        return;
      }
      try {
        await apiJson(`/notifications/${id}/read`, {
          method: 'POST',
          token,
          tenantSubdomain: tenant.subdomain,
        });
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      } catch {
        Alert.alert(t('alerts.generic'), t('notifications.markReadFailed'));
      }
    },
    [token, tenant, t],
  );

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 88 },
        ]}
      >
        <Text style={styles.title}>{t('notifications.title')}</Text>
        <Pressable style={styles.refreshBtn} onPress={() => load().catch(() => {})}>
          <Text style={styles.refreshTxt}>
            {loading ? t('notifications.loading') : t('notifications.refresh')}
          </Text>
        </Pressable>
        {items.length === 0 ? (
          <GlassCard>
            <Text style={styles.empty}>{t('notifications.empty')}</Text>
          </GlassCard>
        ) : (
          items.map((item) => (
            <GlassCard key={item.id} style={[styles.item, item.isRead && styles.itemRead]}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemBody}>{item.body}</Text>
              <Text style={styles.itemDate}>
                {new Date(item.createdAt).toLocaleString('tr-TR', { hour12: false })}
              </Text>
              {!item.isRead ? (
                <Pressable style={styles.readBtn} onPress={() => markRead(item.id).catch(() => {})}>
                  <Text style={styles.readBtnTxt}>{t('notifications.markRead')}</Text>
                </Pressable>
              ) : null}
            </GlassCard>
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 10,
  },
  refreshBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  refreshTxt: {
    color: premium.accentBlue,
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    color: premium.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  item: {
    marginBottom: 10,
  },
  itemRead: {
    opacity: 0.85,
  },
  itemTitle: {
    color: premium.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  itemBody: {
    color: premium.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  itemDate: {
    color: premium.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
  readBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readBtnTxt: {
    color: premium.accentBlue,
    fontSize: 12,
    fontWeight: '700',
  },
});
