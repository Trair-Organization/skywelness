import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { apiJson } from '../../api/client';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { PremiumInput } from '../../components/premium/PremiumInput';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;
type UsernameStatus =
  | 'idle'
  | 'too_short'
  | 'invalid'
  | 'checking'
  | 'available'
  | 'taken'
  | 'error';
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,}$/;
const USERNAME_RULE = /^[a-z0-9çğıöşü_.-]+$/;

export function RegisterScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height <= 860;
  const navigation = useNavigation<Nav>();
  const { tenant, loadingAuth, registerWithFullName } = useMemberAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!tenant) {
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
      return;
    }
    const normalized = username.trim().toLocaleLowerCase('tr-TR');
    if (!normalized) {
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
      return;
    }
    if (normalized.length < 3) {
      setUsernameStatus('too_short');
      setUsernameSuggestions([]);
      return;
    }
    if (!USERNAME_RULE.test(normalized)) {
      setUsernameStatus('invalid');
      setUsernameSuggestions([]);
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    const timer = setTimeout(() => {
      apiJson<{ available: boolean; suggestions?: string[]; reason?: string }>(
        `/auth/username-availability?tenantSubdomain=${encodeURIComponent(tenant.subdomain)}&username=${encodeURIComponent(normalized)}`,
        { auth: false },
      )
        .then((res) => {
          if (cancelled) {
            return;
          }
          if (res.available) {
            setUsernameStatus('available');
            setUsernameSuggestions([]);
            return;
          }
          setUsernameStatus(res.reason === 'too_short' ? 'too_short' : 'taken');
          setUsernameSuggestions(res.suggestions ?? []);
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          // API geçici olarak erişilemezse kullanıcıyı bloklamayalım.
          // Asıl benzersizlik kontrolü kayıt anında backend'de kesin yapılır.
          setUsernameStatus('available');
          setUsernameSuggestions([]);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tenant, username]);

  useEffect(() => {
    if (!showSuccessModal) {
      successAnim.setValue(0);
      return;
    }
    Animated.timing(successAnim, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [showSuccessModal, successAnim]);

  return (
    <GradientBackground>
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top + (compact ? 8 : 16),
            paddingBottom: insets.bottom + (compact ? 12 : 24),
          },
        ]}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            navigation.navigate('Login');
          }}
        >
          <Text style={styles.backTxt}>{t('common.back')}</Text>
        </Pressable>
        <View style={[styles.authSeg, compact && styles.authSegCompact]}>
          <Pressable
            style={styles.authBtn}
            onPress={() => {
              navigation.navigate('Login');
            }}
          >
            <Text style={styles.authTxt}>{t('auth.tabLogin')}</Text>
          </Pressable>
          <Pressable style={[styles.authBtn, styles.authBtnOn]}>
            <Text style={[styles.authTxt, styles.authTxtOn]}>{t('auth.tabRegister')}</Text>
          </Pressable>
        </View>

        <GlassCard style={[styles.card, compact && styles.cardCompact]}>
          <Pressable
            style={styles.trainerCta}
            onPress={() => {
              navigation.navigate('TrainerRegister');
            }}
          >
            <Text style={styles.trainerCtaTxt}>{t('trainerRegister.cta')}</Text>
          </Pressable>
          <PremiumInput
            label={t('onboarding.fullName')}
            value={fullName}
            onChangeText={(v) => {
              setFullName(v);
            }}
            autoCapitalize="words"
            placeholder={t('onboarding.fullNamePh')}
            inputWrapStyle={styles.miniInputWrap}
            style={styles.miniInputText}
            containerStyle={compact ? styles.inputCompact : undefined}
          />
          <PremiumInput
            label={t('register.usernameLabel')}
            value={username}
            onChangeText={(v) => {
              setUsername(v);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('register.usernamePh')}
            rightSlot={
              usernameStatus === 'checking' ? (
                <ActivityIndicator size="small" color={premium.accentBlue} />
              ) : usernameStatus === 'available' ? (
                <Text style={styles.okMark}>✓</Text>
              ) : usernameStatus === 'taken' ||
                usernameStatus === 'too_short' ||
                usernameStatus === 'invalid' ? (
                <Text style={styles.errMark}>✕</Text>
              ) : null
            }
            inputWrapStyle={styles.miniInputWrap}
            style={styles.miniInputText}
            containerStyle={compact ? styles.inputCompact : undefined}
          />
          {usernameStatus === 'too_short' ? (
            <Text style={styles.usernameHelp}>{t('register.usernameMinLength')}</Text>
          ) : null}
          {usernameStatus === 'invalid' ? (
            <Text style={styles.usernameHelpErr}>{t('register.usernameInvalid')}</Text>
          ) : null}
          {usernameStatus === 'taken' ? (
            <Text style={styles.usernameHelpErr}>{t('register.usernameTaken')}</Text>
          ) : null}
          {usernameSuggestions.length > 0 ? (
            <View style={styles.suggestionsWrap}>
              <Text style={styles.suggestionsLabel}>{t('register.usernameSuggestions')}</Text>
              <View style={styles.suggestionsRow}>
                {usernameSuggestions.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setUsername(item);
                    }}
                  >
                    <Text style={styles.suggestionChipTxt}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <PremiumInput
            label={t('register.phoneLabel')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            placeholder={t('register.phonePh')}
            inputWrapStyle={styles.miniInputWrap}
            style={styles.miniInputText}
            containerStyle={compact ? styles.inputCompact : undefined}
          />
          <PremiumInput
            label={t('login.emailLabel')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t('login.emailPh')}
            inputWrapStyle={styles.miniInputWrap}
            style={styles.miniInputText}
            containerStyle={compact ? styles.inputCompact : undefined}
          />
          <PremiumInput
            label={t('login.passwordLabel')}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
            }}
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
            inputWrapStyle={styles.miniInputWrap}
            style={styles.miniInputText}
            containerStyle={compact ? styles.inputCompact : undefined}
          />
          {!compact ? <Text style={styles.hint}>{t('register.passwordRules')}</Text> : null}
          <Pressable
            style={styles.checkRow}
            onPress={() => {
              setAcceptPrivacy((v) => !v);
            }}
          >
            <View style={[styles.checkBox, acceptPrivacy && styles.checkBoxOn]}>
              {acceptPrivacy ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkTxt}>{t('register.acceptPrivacy')}</Text>
          </Pressable>
          <Pressable
            style={styles.checkRow}
            onPress={() => {
              setAcceptTerms((v) => !v);
            }}
          >
            <View style={[styles.checkBox, acceptTerms && styles.checkBoxOn]}>
              {acceptTerms ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkTxt}>{t('register.acceptTerms')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              (!tenant ||
                loadingAuth ||
                usernameStatus === 'checking' ||
                usernameStatus === 'too_short' ||
                usernameStatus === 'invalid' ||
                usernameStatus === 'taken' ||
                !acceptPrivacy ||
                !acceptTerms) &&
                styles.submitBtnDisabled,
            ]}
            onPress={() => {
              if (!acceptPrivacy || !acceptTerms) {
                Alert.alert(t('register.section'), t('register.acceptRequired'));
                return;
              }
              if (!PASSWORD_RULE.test(password)) {
                Alert.alert(t('register.section'), t('register.passwordRules'));
                return;
              }
              registerWithFullName(fullName, username, email, phone, password)
                .then((result) => {
                  if (result === 'pending') {
                    setShowSuccessModal(true);
                  }
                })
                .catch(() => {});
            }}
            disabled={
              !tenant ||
              loadingAuth ||
              usernameStatus === 'checking' ||
              usernameStatus === 'too_short' ||
              usernameStatus === 'invalid' ||
              usernameStatus === 'taken' ||
              !acceptPrivacy ||
              !acceptTerms
            }
          >
            {loadingAuth ? (
              <ActivityIndicator color={premium.accentBlue} />
            ) : (
              <Text style={styles.submitTxt}>{t('register.submit')}</Text>
            )}
          </Pressable>
        </GlassCard>
      </View>
      {showSuccessModal ? (
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                opacity: successAnim,
                transform: [
                  {
                    scale: successAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.modalTitle}>{t('register.successTitle')}</Text>
            <Text style={styles.modalBody}>{t('register.successBody')}</Text>
            <Pressable
              style={styles.modalBtn}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.modalBtnTxt}>{t('onboarding.signIn')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
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
    marginBottom: 6,
  },
  backTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    marginTop: 8,
  },
  trainerCta: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 4,
  },
  trainerCtaTxt: {
    color: premium.accentBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  cardCompact: {
    marginTop: 4,
    paddingVertical: 14,
  },
  authSeg: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 14,
  },
  authSegCompact: {
    marginBottom: 10,
  },
  inputCompact: {
    marginBottom: 10,
  },
  miniInputWrap: {
    minHeight: 48,
  },
  miniInputText: {
    fontSize: 15,
    paddingVertical: 12,
  },
  okMark: {
    color: premium.accentGreen,
    fontSize: 18,
    fontWeight: '800',
  },
  errMark: {
    color: premium.danger,
    fontSize: 16,
    fontWeight: '800',
  },
  usernameHelp: {
    marginTop: -6,
    marginBottom: 8,
    color: premium.textMuted,
    fontSize: 12,
  },
  usernameHelpErr: {
    marginTop: -6,
    marginBottom: 8,
    color: premium.danger,
    fontSize: 12,
  },
  suggestionsWrap: {
    marginTop: -2,
    marginBottom: 10,
  },
  suggestionsLabel: {
    color: premium.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  suggestionChipTxt: {
    color: premium.accentBlue,
    fontSize: 12,
    fontWeight: '600',
  },
  authBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authBtnOn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  authTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  authTxtOn: {
    color: premium.text,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: premium.textMuted,
    marginBottom: 14,
    marginTop: -4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  checkBoxOn: {
    borderColor: premium.accentGreen,
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  checkMark: {
    color: premium.accentGreen,
    fontSize: 13,
    fontWeight: '800',
  },
  checkTxt: {
    flex: 1,
    color: premium.textMuted,
    fontSize: 12,
    lineHeight: 17,
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
  eyeTxt: {
    color: premium.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    width: '100%',
    borderRadius: premium.radius,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(5, 16, 28, 0.96)',
    padding: 18,
  },
  modalTitle: {
    color: premium.accentGreen,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalBody: {
    color: premium.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  modalBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  modalBtnTxt: {
    color: premium.accentBlue,
    fontSize: 17,
    fontWeight: '700',
  },
});
