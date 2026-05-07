import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { PremiumInput } from '../../components/premium/PremiumInput';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      Alert.alert(t('forgot.title'), t('login.emailLabel'));
      return;
    }
    setSending(true);
    try {
      await apiJson('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: email.trim() }),
      });
      Alert.alert(t('forgot.title'), t('forgot.sentBody'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e) {
      Alert.alert(t('forgot.title'), e instanceof ApiError ? e.message : t('forgot.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <GradientBackground>
      <View
        style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('forgot.title')}</Text>
        <Text style={styles.body}>{t('forgot.body')}</Text>
        <GlassCard style={styles.card}>
          <PremiumInput
            label={t('login.emailLabel')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('login.emailPh')}
          />
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              sending && styles.submitBtnDisabled,
            ]}
            disabled={sending}
            onPress={() => {
              submit().catch(() => {});
            }}
          >
            <Text style={styles.submitTxt}>{t('forgot.submit')}</Text>
          </Pressable>
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 22,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  backTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  body: {
    color: premium.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  card: {
    marginTop: 8,
  },
  submitBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  submitBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitTxt: {
    color: premium.accentBlue,
    fontSize: 17,
    fontWeight: '700',
  },
});
