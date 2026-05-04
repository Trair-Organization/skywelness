import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { GlowButton } from '../../components/premium/GlowButton';
import { PremiumInput } from '../../components/premium/PremiumInput';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export function RegisterScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { tenant, loadingAuth, registerWithFullName } = useMemberAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);

  return (
    <GradientBackground>
      <View
        style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      >
        <Text style={styles.title}>{t('onboarding.createAccountHeadline')}</Text>
        {tenant ? (
          <Text style={styles.clubLine}>
            {tenant.name} · {tenant.subdomain}
          </Text>
        ) : (
          <Text style={styles.warn}>{t('login.needTenant')}</Text>
        )}

        <GlassCard style={styles.card}>
          <PremiumInput
            label={t('onboarding.fullName')}
            value={fullName}
            onChangeText={(v) => {
              setFullName(v);
              setLocalErr(null);
            }}
            autoCapitalize="words"
            placeholder={t('onboarding.fullNamePh')}
          />
          <PremiumInput
            label={t('login.emailLabel')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t('login.emailPh')}
          />
          <PremiumInput
            label={t('login.passwordLabel')}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setLocalErr(null);
            }}
            secureTextEntry
            placeholder={t('login.passwordPh')}
          />
          <Text style={styles.hint}>{t('register.passwordRules')}</Text>
          <PremiumInput
            label={t('onboarding.confirmPassword')}
            value={confirm}
            onChangeText={(v) => {
              setConfirm(v);
              setLocalErr(null);
            }}
            secureTextEntry
            placeholder={t('login.passwordPh')}
            error={localErr}
          />

          <GlowButton
            label={t('register.submit')}
            onPress={() => {
              if (password !== confirm) {
                setLocalErr(t('register.confirmMismatch'));
                return;
              }
              setLocalErr(null);
              registerWithFullName(fullName, email, password, confirm).catch(() => {});
            }}
            loading={loadingAuth}
            disabled={!tenant || loadingAuth}
          />

          <Pressable
            style={styles.linkRow}
            onPress={() => {
              navigation.navigate('Login');
            }}
          >
            <Text style={styles.muted}>{t('onboarding.alreadyHave')} </Text>
            <Text style={styles.link}>{t('onboarding.loginCta')}</Text>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: premium.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  clubLine: {
    fontSize: 14,
    color: premium.textMuted,
    marginBottom: 20,
  },
  warn: {
    fontSize: 14,
    color: premium.danger,
    marginBottom: 20,
  },
  card: {
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: premium.textMuted,
    marginBottom: 14,
    marginTop: -4,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  muted: {
    color: premium.textMuted,
    fontSize: 15,
  },
  link: {
    color: premium.accentBlue,
    fontSize: 15,
    fontWeight: '700',
  },
});
