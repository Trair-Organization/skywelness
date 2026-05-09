import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { premium } from '../../theme/premiumTheme';

type MessageRow = {
  id: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'system';
  isRead: boolean;
  createdAt: string;
  isOwn: boolean;
};

type ChatRouteParams = {
  Chat: {
    conversationId: string;
    otherUser: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  };
};

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<ChatRouteParams, 'Chat'>>();
  const { conversationId, otherUser } = route.params;
  const { token, tenant } = useMemberAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const rows = await apiJson<MessageRow[]>(
        `/messages/conversations/${conversationId}?limit=50`,
        {
          token,
          tenantSubdomain: tenant.subdomain,
        },
      );
      setMessages(rows);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, tenant, conversationId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const id = setInterval(loadMessages, 5000);
    return () => clearInterval(id);
  }, [loadMessages]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !token || !tenant || sending) return;
    setSending(true);
    setText('');
    try {
      const msg = await apiJson<MessageRow>(`/messages/conversations/${conversationId}`, {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({ content: trimmed }),
      });
      setMessages((prev) => [...prev, { ...msg, isOwn: true }]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setText(trimmed); // Restore on failure
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessage = ({ item }: { item: MessageRow }) => (
    <View style={[styles.msgRow, item.isOwn && styles.msgRowOwn]}>
      <View style={[styles.msgBubble, item.isOwn ? styles.msgBubbleOwn : styles.msgBubbleOther]}>
        <Text style={[styles.msgText, item.isOwn && styles.msgTextOwn]}>{item.content}</Text>
        <Text style={[styles.msgTime, item.isOwn && styles.msgTimeOwn]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    </View>
  );

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerInitials}>
              {otherUser.firstName[0]}
              {otherUser.lastName[0]}
            </Text>
          </View>
          <Text style={styles.headerName}>
            {otherUser.firstName} {otherUser.lastName}
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={premium.accentBlue} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Mesaj yaz..."
            placeholderTextColor={premium.textMuted}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && styles.sendBtnPressed,
              (!text.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={premium.accentBlue} />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInitials: { color: premium.accentBlue, fontSize: 14, fontWeight: '800' },
  headerName: { color: premium.text, fontSize: 16, fontWeight: '700' },
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { marginBottom: 8, alignItems: 'flex-start' },
  msgRowOwn: { alignItems: 'flex-end' },
  msgBubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  msgBubbleOwn: {
    backgroundColor: 'rgba(56,189,248,0.2)',
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  msgText: { color: premium.text, fontSize: 15, lineHeight: 21 },
  msgTextOwn: {},
  msgTime: { color: premium.textMuted, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  msgTimeOwn: { color: 'rgba(56,189,248,0.7)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premium.glassBorder,
    backgroundColor: 'rgba(5,8,16,0.9)',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: premium.text,
    maxHeight: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnPressed: { backgroundColor: 'rgba(56,189,248,0.3)' },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: premium.accentBlue, fontSize: 18, fontWeight: '700' },
});
