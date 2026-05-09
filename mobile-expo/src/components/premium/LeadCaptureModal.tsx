import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiJson } from '../../api/client';
import { PremiumInput } from './PremiumInput';
import { showToast } from './Toast';
import { premium } from '../../theme/premiumTheme';

type LeadCaptureProps = {
  visible: boolean;
  onClose: () => void;
  source: 'club' | 'trainer' | 'campaign' | 'event';
  sourceRef?: string;
  sourceLabel?: string;
  clubSubdomain?: string;
  /** Otomatik mesaj (kampanya adı, eğitmen adı vb.) */
  prefillMessage?: string;
};

export function LeadCaptureModal({
  visible,
  onClose,
  source,
  sourceRef,
  sourceLabel,
  clubSubdomain,
  prefillMessage,
}: LeadCaptureProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(prefillMessage ?? '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      showToast('Ad ve telefon zorunludur', 'warning');
      return;
    }
    setSending(true);
    try {
      await apiJson('/leads', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          message: message.trim() || undefined,
          source,
          sourceRef,
          sourceLabel,
          clubSubdomain,
        }),
      });
      setSent(true);
      showToast('Talebiniz iletildi! En kısa sürede dönüş yapılacak.', 'success', 4000);
    } catch {
      showToast('Gönderilemedi, lütfen tekrar deneyin.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setName('');
    setPhone('');
    setMessage(prefillMessage ?? '');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          {sent ? (
            <>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successTitle}>Talebiniz Alındı</Text>
              <Text style={styles.successBody}>
                En kısa sürede sizinle iletişime geçilecektir. Teşekkürler!
              </Text>
              <Pressable style={styles.closeBtn} onPress={handleClose}>
                <Text style={styles.closeBtnTxt}>Tamam</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>💬 İletişime Geç</Text>
              {sourceLabel && <Text style={styles.sourceLabel}>{sourceLabel}</Text>}
              <Text style={styles.subtitle}>
                Bilgilerinizi bırakın, size en kısa sürede dönüş yapalım.
              </Text>

              <PremiumInput
                label="Ad Soyad *"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholder="Adınız Soyadınız"
              />
              <PremiumInput
                label="Telefon *"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+90 5xx xxx xx xx"
              />
              <PremiumInput
                label="Mesaj (opsiyonel)"
                value={message}
                onChangeText={setMessage}
                placeholder="Sormak istediğiniz bir şey var mı?"
                multiline
              />

              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.submitBtnPressed,
                  sending && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color={premium.accentBlue} />
                ) : (
                  <Text style={styles.submitBtnTxt}>Gönder</Text>
                )}
              </Pressable>

              <Pressable style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnTxt}>Vazgeç</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(5,16,28,0.97)',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 4,
  },
  sourceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: premium.accentBlue,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: premium.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  submitBtn: {
    borderWidth: 1,
    borderColor: premium.accentBlue,
    borderRadius: premium.radiusSm,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.1)',
    marginTop: 8,
  },
  submitBtnPressed: { backgroundColor: 'rgba(56,189,248,0.25)' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnTxt: { color: premium.accentBlue, fontSize: 16, fontWeight: '800' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnTxt: { color: premium.textMuted, fontSize: 14, fontWeight: '600' },
  successEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: premium.accentGreen,
    textAlign: 'center',
    marginBottom: 8,
  },
  successBody: {
    fontSize: 14,
    color: premium.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnTxt: { color: premium.text, fontSize: 15, fontWeight: '700' },
});
