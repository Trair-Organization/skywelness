import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { tenant, email, setEmail, password, setPassword, loadingAuth, login, clearClubSelection } =
    useMemberAuth();

  return (
    <GradientBackground>
      <View
        style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      >
        <Text style={styles.title}>{t('onboarding.welcomeBack')}</Text>
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
            secureTextEntry
            placeholder={t('login.passwordPh')}
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

          <GlowButton
            label={t('onboarding.signIn')}
            onPress={() => {
              login().catch(() => {});
            }}
            loading={loadingAuth}
            disabled={!tenant || loadingAuth}
          />

          <Pressable
            style={styles.linkRow}
            onPress={() => {
              navigation.navigate('Register');
            }}
          >
            <Text style={styles.muted}>{t('onboarding.noAccount')} </Text>
            <Text style={styles.link}>{t('onboarding.signUp')}</Text>
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
    color: premium.accentGreen,
    fontSize: 15,
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
