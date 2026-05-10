import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
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

type TrainerContact = {
  id: string;
  userId: string;
  name: string;
};

export function MessagesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const navigation = useNavigation<Nav>();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New conversation modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [trainers, setTrainers] = useState<TrainerContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

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

  const loadContacts = async () => {
    if (!token || !tenant) return;
    setLoadingContacts(true);
    try {
      const rows = await apiJson<
        Array<{ id: string; user: { id: string; firstName: string; lastName: string } }>
      >('/trainers', { token, tenantSubdomain: tenant.subdomain });
      setTrainers(
        rows.map((r) => ({
          id: r.id,
          userId: r.user.id,
          name: `${r.user.firstName} ${r.user.lastName}`.trim(),
        })),
      );
    } catch {
      // ignore
    } finally {
      setLoadingContacts(false);
    }
  };

  const startConversationWith = async (
    otherUserId: string,
    firstName: string,
    lastName: string,
  ) => {
    if (!token || !tenant) return;
    try {
      const res = await apiJson<{ conversationId: string }>('/messages/conversations', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({ otherUserId }),
      });
      setShowNewChat(false);
      navigation.navigate('Chat', {
        conversationId: res.conversationId,
        otherUser: { id: otherUserId, firstName, lastName, photoUrl: null, role: 'trainer' },
      });
    } catch {
      // ignore
    }
  };

  const startClubChat = async () => {
    if (!token || !tenant) return;
    try {
      const res = await apiJson<{ conversationId: string }>('/messages/conversations/club', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setShowNewChat(false);
      navigation.navigate('Chat', {
        conversationId: res.conversationId,
        otherUser: {
          id: '',
          firstName: tenant.name || 'Kulüp',
          lastName: '',
          photoUrl: null,
          role: 'administrator',
        },
      });
    } catch {
      // ignore
    }
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
        <View style={styles.headerRow}>
          <Text style={styles.title}>💬 Mesajlar</Text>
          <Pressable
            style={styles.newChatBtn}
            onPress={() => {
              setShowNewChat(true);
              loadContacts();
            }}
          >
            <Text style={styles.newChatBtnTxt}>+ Yeni</Text>
          </Pressable>
        </View>
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

      {/* New Conversation Modal */}
      <Modal visible={showNewChat} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowNewChat(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Yeni Mesaj</Text>
            <Text style={styles.modalSub}>Eğitmenlerinize veya kulübünüze mesaj gönderin</Text>

            {/* Club Chat */}
            <Pressable style={styles.contactItem} onPress={startClubChat}>
              <View style={styles.contactAvatarClub}>
                <Text style={styles.contactAvatarClubTxt}>🏢</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{tenant?.name || 'Kulüp'}</Text>
                <Text style={styles.contactRole}>Kulüp Yönetimi</Text>
              </View>
              <Text style={styles.contactArrow}>›</Text>
            </Pressable>

            {/* Trainers */}
            {loadingContacts ? (
              <ActivityIndicator
                size="small"
                color={premium.accentBlue}
                style={{ marginTop: 16 }}
              />
            ) : (
              <ScrollView style={styles.contactList} showsVerticalScrollIndicator={false}>
                {trainers.map((tr) => (
                  <Pressable
                    key={tr.id}
                    style={styles.contactItem}
                    onPress={() => {
                      const nameParts = tr.name.split(' ');
                      startConversationWith(
                        tr.userId,
                        nameParts[0] || '',
                        nameParts.slice(1).join(' ') || '',
                      );
                    }}
                  >
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarTxt}>
                        {tr.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{tr.name}</Text>
                      <Text style={styles.contactRole}>🏋️ Eğitmen</Text>
                    </View>
                    <Text style={styles.contactArrow}>›</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <Pressable style={styles.modalCloseBtn} onPress={() => setShowNewChat(false)}>
              <Text style={styles.modalCloseBtnTxt}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: premium.text },
  newChatBtn: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  newChatBtnTxt: { fontSize: 13, fontWeight: '700', color: premium.accentBlue },
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

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '75%',
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
  contactList: { maxHeight: 300 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.1)',
  },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarTxt: { color: premium.accentBlue, fontSize: 14, fontWeight: '800' },
  contactAvatarClub: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarClubTxt: { fontSize: 20 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '700', color: premium.text },
  contactRole: { fontSize: 12, color: premium.textMuted, marginTop: 1 },
  contactArrow: { fontSize: 22, color: premium.textMuted },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  modalCloseBtnTxt: { fontSize: 15, fontWeight: '600', color: premium.textMuted },
});
