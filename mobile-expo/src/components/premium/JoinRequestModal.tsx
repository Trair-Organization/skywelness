import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiJson, ApiError } from '../../api/client';
import { premium } from '../../theme/premiumTheme';
import { showToast } from './Toast';

type JoinRequestModalProps = {
  visible: boolean;
  club: { name: string; subdomain: string } | null;
  token: string | null;
  tenantSubdomain: string | null;
  onClose: () => void;
  onSuccess?: () => void;
};

/**
 * Private partner kulübe üyelik başvurusu modalı.
 * POST /tenants/:subdomain/join-requests
 */
export function JoinRequestModal({
  visible,
  club,
  token,
  tenantSubdomain,
  onClose,
  onSuccess,
}: JoinRequestModalProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!club || !token) return;
    setSubmitting(true);
    try {
      await apiJson(`/tenants/${encodeURIComponent(club.subdomain)}/join-requests`, {
        method: 'POST',
        token,
        tenantSubdomain: tenantSubdomain ?? undefined,
        body: JSON.stringify({ message: message.trim() || undefined }),
      });
      showToast(`${club.name} için başvurunuz alındı`, 'success');
      setMessage('');
      onSuccess?.();
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        const code = resolveErrorCode(e.body);
        if (code === 'already_member') {
          showToast('Zaten bu kulübün üyesisiniz', 'info');
          onClose();
          return;
        }
        if (code === 'membership_rejected') {
          showToast('Başvurunuz daha önce reddedildi', 'error');
          onClose();
          return;
        }
        if (code === 'club_is_public') {
          showToast('Bu kulüp public — direkt rezervasyon yapabilirsiniz', 'info');
          onClose();
          return;
        }
        showToast(e.message, 'error');
      } else {
        showToast('Başvuru gönderilemedi', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setMessage('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Üyelik Başvurusu</Text>
          <Text style={styles.subtitle}>
            {club?.name ?? 'Kulüp'} özel bir partner kulüptür. Başvurunuz kulüp yetkililerine
            iletilecek, onay sonrasında hizmetleri görebilir ve rezervasyon yapabilirsiniz.
          </Text>

          <Text style={styles.label}>Mesajınız (opsiyonel)</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={4}
            value={message}
            onChangeText={setMessage}
            placeholder="Örn. Rezidans sakiniyim, spa hizmetlerinizi kullanmak istiyorum."
            placeholderTextColor={premium.textMuted}
            editable={!submitting}
            maxLength={500}
          />
          <Text style={styles.counter}>{message.length}/500</Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              (submitting || !club) && styles.primaryBtnDisabled,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={handleSubmit}
            disabled={submitting || !club}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnTxt}>📨 Başvuruyu Gönder</Text>
            )}
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={handleClose} disabled={submitting}>
            <Text style={styles.secondaryBtnTxt}>Vazgeç</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function resolveErrorCode(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  if (typeof record.code === 'string') return record.code;
  const nested = record.message;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const code = (nested as Record<string, unknown>).code;
    if (typeof code === 'string') return code;
  }
  return null;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,8,18,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: '#0a1020',
    padding: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: premium.textMuted,
    lineHeight: 18,
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    color: premium.textMuted,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    color: premium.text,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  counter: {
    fontSize: 11,
    color: premium.textMuted,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: premium.accentBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnPressed: { opacity: 0.85 },
  primaryBtnTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnTxt: {
    color: premium.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
});
