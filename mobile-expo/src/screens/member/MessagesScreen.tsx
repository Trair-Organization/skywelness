import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { EmptyState } from '../../components/premium/EmptyState';
import { premium } from '../../theme/premiumTheme';

type ConversationRow = {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    role: string;
  };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type Nav = NativeStackNavigationProp<{
  Chat: { conversationId: string; otherUser: ConversationRow['otherUser'] };
}>;

export function MessagesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const navigation = useNavigation<Nav>();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const rows = await apiJson<ConversationRow[]>('/messages/conversations', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setConversations(rows);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, tenant]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll every 10 seconds for new messages
  useEffect(() => {
    if (!token || !tenant) return;
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [token, tenant, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60000) return 'Şimdi';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}dk`;
    if (diffMs < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'trainer':
        return '🏋️ Eğitmen';
      case 'independent_trainer':
        return '🏋️ Eğitmen';
      case 'administrator':
        return '🏢 Kulüp';
      default:
        return '';
    }
  };

  const renderItem = ({ item }: { item: ConversationRow }) => (
    <Pressable
      style={({ pressed }) => [styles.convRow, pressed && styles.convRowPressed]}
      onPress={() =>
        navigation.navigate('Chat', { conversationId: item.id, otherUser: item.otherUser })
      }
    >
      <View style={styles.avatarWrap}>
        {item.otherUser.photoUrl ? (
          <Image source={{ uri: item.otherUser.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>
              {item.otherUser.firstName[0]}
              {item.otherUser.lastName[0]}
            </Text>
          </View>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.convContent}>
        <View style={styles.convTopRow}>
          <Text style={styles.convName} numberOfLines={1}>
            {item.otherUser.firstName} {item.otherUser.lastName}
          </Text>
          <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <Text style={styles.convRole}>{roleLabel(item.otherUser.role)}</Text>
        {item.lastMessagePreview && (
          <Text
            style={[styles.convPreview, item.unreadCount > 0 && styles.convPreviewUnread]}
            numberOfLines={1}
          >
            {item.lastMessagePreview}
          </Text>
        )}
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 60 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>💬 Mesajlar</Text>
        {conversations.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Henüz mesajınız yok"
            description="Eğitmenlerle veya kulüplerle iletişime geçtiğinizde mesajlarınız burada görünecek."
          />
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={premium.accentBlue}
              />
            }
          />
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: premium.text, marginBottom: 16 },
  list: { paddingBottom: 80 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  convRowPressed: { opacity: 0.7 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: premium.accentBlue, fontSize: 16, fontWeight: '800' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  convContent: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { color: premium.text, fontSize: 15, fontWeight: '700', flex: 1 },
  convTime: { color: premium.textMuted, fontSize: 12, fontWeight: '600' },
  convRole: { color: premium.textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 },
  convPreview: { color: premium.textMuted, fontSize: 13, marginTop: 3 },
  convPreviewUnread: { color: premium.text, fontWeight: '600' },
});
