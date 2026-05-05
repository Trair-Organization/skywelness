import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { PremiumInput } from '../../components/premium/PremiumInput';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { tenant, email, setEmail, password, setPassword, loadingAuth, login, clearClubSelection } =
    useMemberAuth();
  const [showPassword, setShowPassword] = useState(false);
  const title = tenant
    ? t('login.welcomeClub', { club: tenant.name })
    : t('onboarding.welcomeBack');

  return (
    <GradientBackground>
      <View
        style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            navigation.navigate('ClubConnect');
          }}
        >
          <Text style={styles.backTxt}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        {tenant ? (
          <Text style={styles.clubLine}>
            {tenant.name} · {tenant.subdomain}
          </Text>
        ) : (
          <Text style={styles.warn}>{t('login.needTenant')}</Text>
        )}
        <GlassCard style={styles.card}>
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
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder={t('login.passwordPh')}
            rightSlot={
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setShowPassword((prev) => !prev);
                }}
              >
                <Text style={styles.eyeTxt}>
                  {showPassword ? t('common.hide') : t('common.show')}
                </Text>
              </Pressable>
            }
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Alert.alert(t('forgot.title'), t('forgot.body'));
            }}
            style={styles.forgot}
          >
            <Text style={styles.forgotTxt}>{t('forgot.link')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              (!tenant || loadingAuth) && styles.submitBtnDisabled,
            ]}
            onPress={() => {
              login().catch(() => {});
            }}
            disabled={!tenant || loadingAuth}
          >
            <Text style={styles.submitTxt}>{t('login.submit')}</Text>
          </Pressable>
        </GlassCard>

        <Pressable
          style={styles.changeClub}
          onPress={() => {
            clearClubSelection();
            navigation.navigate('ClubConnect');
          }}
        >
          <Text style={styles.changeClubTxt}>{t('onboarding.changeClub')}</Text>
        </Pressable>
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
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 6,
  },
  backTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '700',
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
  forgot: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  forgotTxt: {
    color: premium.accentBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  eyeTxt: {
    color: premium.textMuted,
    fontSize: 13,
    fontWeight: '700',
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
    opacity: 0.5,
  },
  submitTxt: {
    color: premium.accentBlue,
    fontSize: 18,
    fontWeight: '700',
  },
  changeClub: {
    marginTop: 24,
    alignItems: 'center',
  },
  changeClubTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
