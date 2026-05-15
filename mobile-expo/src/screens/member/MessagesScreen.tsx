import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { apiJson } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { EmptyState } from '../../components/premium/EmptyState';
import { showToast } from '../../components/premium/Toast';
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
  lastMessageSenderId: string | null;
  isLastMessageMine: boolean;
  unreadCount: number;
};

type BlockedUserRow = {
  id: string;
  blockedAt: string;
  reason: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    role: string;
  } | null;
};

type Nav = NativeStackNavigationProp<{
  Chat: { conversationId: string; otherUser: ConversationRow['otherUser'] };
}>;

type TrainerContact = { id: string; userId: string; name: string };

type ReportCategory =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'fake_profile'
  | 'violence'
  | 'other';

const REPORT_CATEGORIES: Array<{ key: ReportCategory; label: string; icon: string }> = [
  { key: 'spam', label: 'Spam / Reklam', icon: '📢' },
  { key: 'harassment', label: 'Taciz / Hakaret', icon: '😡' },
  { key: 'inappropriate', label: 'Uygunsuz İçerik', icon: '⚠️' },
  { key: 'fake_profile', label: 'Sahte Profil / Dolandırıcılık', icon: '🎭' },
  { key: 'violence', label: 'Şiddet / Tehdit', icon: '⛔' },
  { key: 'other', label: 'Diğer', icon: '❓' },
];

export function MessagesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, tenant } = useMemberAuth();
  const navigation = useNavigation<Nav>();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'inbox' | 'sent' | 'blocked'>('all');

  // New conversation modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [trainers, setTrainers] = useState<TrainerContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Report modal
  const [reportTarget, setReportTarget] = useState<{
    userId: string;
    conversationId: string;
    userName: string;
  } | null>(null);
  const [reportCategory, setReportCategory] = useState<ReportCategory>('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const load = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const rows = await apiJson<ConversationRow[]>('/messages/conversations', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setConversations(rows);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, [token, tenant]);

  const loadBlocked = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const rows = await apiJson<BlockedUserRow[]>('/messages/users/blocked', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setBlockedUsers(rows);
    } catch {
      /* */
    }
  }, [token, tenant]);

  useEffect(() => {
    load();
    loadBlocked();
  }, [load, loadBlocked]);

  // Poll
  useEffect(() => {
    if (!token || !tenant) return;
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [token, tenant, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), loadBlocked()]);
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
      /* */
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
      /* */
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
      /* */
    }
  };

  // ═══ MODERATION ═══

  const deleteConversation = async (convId: string) => {
    if (!token || !tenant) return;
    Alert.alert('Sohbeti Sil', 'Bu sohbeti silmek istediğinize emin misiniz?', [
      {
        text: 'Vazgeç',
        style: 'cancel',
        onPress: () => swipeableRefs.current.get(convId)?.close(),
      },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiJson(`/messages/conversations/${convId}`, {
              method: 'DELETE',
              token,
              tenantSubdomain: tenant.subdomain,
            });
            setConversations((prev) => prev.filter((c) => c.id !== convId));
            showToast('Sohbet silindi', 'success');
          } catch {
            showToast('Sohbet silinemedi', 'error');
          }
        },
      },
    ]);
  };

  const blockUser = async (userId: string, userName: string, convId: string) => {
    if (!token || !tenant) return;
    Alert.alert(
      'Kullanıcıyı Engelle',
      `${userName} kullanıcısını engellemek istediğinize emin misiniz? Bu kullanıcı size mesaj gönderemeyecek.`,
      [
        {
          text: 'Vazgeç',
          style: 'cancel',
          onPress: () => swipeableRefs.current.get(convId)?.close(),
        },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiJson(`/messages/users/${userId}/block`, {
                method: 'POST',
                token,
                tenantSubdomain: tenant.subdomain,
                body: JSON.stringify({}),
              });
              setConversations((prev) => prev.filter((c) => c.id !== convId));
              await loadBlocked();
              showToast(`${userName} engellendi`, 'success');
            } catch {
              showToast('Engelleme başarısız', 'error');
            }
          },
        },
      ],
    );
  };

  const unblockUser = async (userId: string, userName: string) => {
    if (!token || !tenant) return;
    Alert.alert(
      'Engeli Kaldır',
      `${userName} kullanıcısının engelini kaldırmak istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Engeli Kaldır',
          onPress: async () => {
            try {
              await apiJson(`/messages/users/${userId}/block`, {
                method: 'DELETE',
                token,
                tenantSubdomain: tenant.subdomain,
              });
              setBlockedUsers((prev) => prev.filter((b) => b.user?.id !== userId));
              showToast(`${userName} için engel kaldırıldı`, 'success');
            } catch {
              showToast('Engel kaldırılamadı', 'error');
            }
          },
        },
      ],
    );
  };

  const submitReport = async () => {
    if (!token || !tenant || !reportTarget) return;
    setSubmittingReport(true);
    try {
      await apiJson('/messages/reports', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({
          reportedUserId: reportTarget.userId,
          conversationId: reportTarget.conversationId,
          category: reportCategory,
          description: reportDescription.trim() || undefined,
        }),
      });
      showToast('Şikayetiniz alındı, 24 saat içinde incelenecek', 'success');
      setReportTarget(null);
      setReportDescription('');
      setReportCategory('spam');
    } catch {
      showToast('Şikayet gönderilemedi', 'error');
    } finally {
      setSubmittingReport(false);
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
      case 'independent_trainer':
        return '🏋️ Eğitmen';
      case 'administrator':
        return '🏢 Kulüp';
      default:
        return '';
    }
  };

  // ═══ Swipe actions ═══
  const renderRightActions = (item: ConversationRow) => (
    <View style={styles.swipeActionsRow}>
      <Pressable
        style={[styles.swipeAction, { backgroundColor: '#f59e0b' }]}
        onPress={() => {
          swipeableRefs.current.get(item.id)?.close();
          setReportTarget({
            userId: item.otherUser.id,
            conversationId: item.id,
            userName: `${item.otherUser.firstName} ${item.otherUser.lastName}`.trim(),
          });
        }}
      >
        <Text style={styles.swipeActionTxt}>🚩</Text>
        <Text style={styles.swipeActionLabel}>Şikayet</Text>
      </Pressable>
      <Pressable
        style={[styles.swipeAction, { backgroundColor: '#7c3aed' }]}
        onPress={() =>
          blockUser(
            item.otherUser.id,
            `${item.otherUser.firstName} ${item.otherUser.lastName}`.trim(),
            item.id,
          )
        }
      >
        <Text style={styles.swipeActionTxt}>🚫</Text>
        <Text style={styles.swipeActionLabel}>Engelle</Text>
      </Pressable>
      <Pressable
        style={[styles.swipeAction, { backgroundColor: '#ef4444' }]}
        onPress={() => deleteConversation(item.id)}
      >
        <Text style={styles.swipeActionTxt}>🗑️</Text>
        <Text style={styles.swipeActionLabel}>Sil</Text>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: ConversationRow }) => (
    <Swipeable
      ref={(ref) => {
        if (ref) swipeableRefs.current.set(item.id, ref);
      }}
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
    >
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
              {item.isLastMessageMine ? '📤 ' : ''}
              {item.lastMessagePreview}
            </Text>
          )}
        </View>
      </Pressable>
    </Swipeable>
  );

  const renderBlockedItem = ({ item }: { item: BlockedUserRow }) => {
    if (!item.user) return null;
    const fullName = `${item.user.firstName} ${item.user.lastName}`.trim();
    return (
      <Pressable style={styles.convRow} onPress={() => unblockUser(item.user!.id, fullName)}>
        <View style={styles.avatarWrap}>
          {item.user.photoUrl ? (
            <Image source={{ uri: item.user.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>
                {item.user.firstName[0]}
                {item.user.lastName[0]}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.convContent}>
          <Text style={styles.convName}>{fullName}</Text>
          <Text style={styles.convRole}>🚫 Engellendi</Text>
          <Text style={styles.convPreview}>Engeli kaldırmak için dokun</Text>
        </View>
      </Pressable>
    );
  };

  const filteredConversations = conversations.filter((c) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'inbox') return !c.isLastMessageMine;
    if (activeTab === 'sent') return c.isLastMessageMine;
    return false;
  });

  const inboxCount = conversations.filter((c) => !c.isLastMessageMine && c.lastMessageAt).length;
  const sentCount = conversations.filter((c) => c.isLastMessageMine).length;

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
      <GestureHandlerRootView style={{ flex: 1 }}>
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

          {/* Tab Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabScroll}
            contentContainerStyle={styles.tabBar}
          >
            <Pressable
              style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabBtnTxt, activeTab === 'all' && styles.tabBtnTxtActive]}>
                Tümü ({conversations.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, activeTab === 'inbox' && styles.tabBtnActive]}
              onPress={() => setActiveTab('inbox')}
            >
              <Text style={[styles.tabBtnTxt, activeTab === 'inbox' && styles.tabBtnTxtActive]}>
                📥 Gelen ({inboxCount})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, activeTab === 'sent' && styles.tabBtnActive]}
              onPress={() => setActiveTab('sent')}
            >
              <Text style={[styles.tabBtnTxt, activeTab === 'sent' && styles.tabBtnTxtActive]}>
                📤 Gönderilen ({sentCount})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, activeTab === 'blocked' && styles.tabBtnActive]}
              onPress={() => setActiveTab('blocked')}
            >
              <Text style={[styles.tabBtnTxt, activeTab === 'blocked' && styles.tabBtnTxtActive]}>
                🚫 Engellenenler ({blockedUsers.length})
              </Text>
            </Pressable>
          </ScrollView>

          {/* List */}
          {activeTab === 'blocked' ? (
            blockedUsers.length === 0 ? (
              <EmptyState
                icon="🚫"
                title="Engellenmiş kullanıcı yok"
                description="Bir kullanıcıyı engellediğinizde burada görünecek. Listeye dokunarak engeli kaldırabilirsiniz."
              />
            ) : (
              <FlatList
                data={blockedUsers}
                renderItem={renderBlockedItem}
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
            )
          ) : filteredConversations.length === 0 ? (
            <EmptyState
              icon="💬"
              title={
                activeTab === 'inbox'
                  ? 'Gelen mesaj yok'
                  : activeTab === 'sent'
                    ? 'Gönderilen mesaj yok'
                    : 'Henüz mesajınız yok'
              }
              description="Eğitmenlerle veya kulüplerle iletişime geçtiğinizde mesajlarınız burada görünecek. Sola kaydırarak şikayet, engelle veya sil işlemi yapabilirsiniz."
            />
          ) : (
            <FlatList
              data={filteredConversations}
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

        {/* Report Modal */}
        <Modal visible={!!reportTarget} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setReportTarget(null)} />
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>🚩 Şikayet Et</Text>
              <Text style={styles.modalSub}>
                {reportTarget?.userName} hakkında şikayetinizi seçin. 24 saat içinde incelenecektir.
              </Text>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {REPORT_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.key}
                    style={[styles.reportCat, reportCategory === cat.key && styles.reportCatActive]}
                    onPress={() => setReportCategory(cat.key)}
                  >
                    <Text style={styles.reportCatIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.reportCatLabel,
                        reportCategory === cat.key && styles.reportCatLabelActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                    {reportCategory === cat.key && <Text style={styles.reportCatCheck}>✓</Text>}
                  </Pressable>
                ))}

                <TextInput
                  style={styles.reportInput}
                  value={reportDescription}
                  onChangeText={setReportDescription}
                  placeholder="Açıklama (opsiyonel)"
                  placeholderTextColor={premium.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </ScrollView>

              <Pressable
                style={[styles.reportSubmitBtn, submittingReport && { opacity: 0.5 }]}
                onPress={submitReport}
                disabled={submittingReport}
              >
                <Text style={styles.reportSubmitTxt}>
                  {submittingReport ? 'Gönderiliyor...' : '🚩 Şikayet Gönder'}
                </Text>
              </Pressable>
              <Pressable style={styles.modalCloseBtn} onPress={() => setReportTarget(null)}>
                <Text style={styles.modalCloseBtnTxt}>Vazgeç</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </GestureHandlerRootView>
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
    marginBottom: 12,
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
  tabScroll: { marginBottom: 12, maxHeight: 40 },
  tabBar: { gap: 8, paddingRight: 16 },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.4)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  tabBtnActive: { backgroundColor: 'rgba(56,189,248,0.12)', borderColor: premium.accentBlue },
  tabBtnTxt: { fontSize: 12, fontWeight: '700', color: premium.textMuted },
  tabBtnTxtActive: { color: premium.accentBlue },
  list: { paddingBottom: 80 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  convRowPressed: { opacity: 0.7, backgroundColor: 'rgba(15,23,42,0.3)' },
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

  // Swipe actions
  swipeActionsRow: { flexDirection: 'row', height: '100%' },
  swipeAction: { width: 80, justifyContent: 'center', alignItems: 'center', gap: 4 },
  swipeActionTxt: { fontSize: 22 },
  swipeActionLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
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

  // Report modal
  reportCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.4)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginBottom: 8,
  },
  reportCatActive: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: '#f59e0b',
  },
  reportCatIcon: { fontSize: 18 },
  reportCatLabel: { flex: 1, color: premium.text, fontSize: 14, fontWeight: '600' },
  reportCatLabelActive: { color: '#f59e0b', fontWeight: '700' },
  reportCatCheck: { color: '#f59e0b', fontSize: 18, fontWeight: '800' },
  reportInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 10,
    padding: 12,
    color: premium.text,
    fontSize: 14,
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reportSubmitBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#ef4444',
  },
  reportSubmitTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
