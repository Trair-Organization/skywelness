import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { apiJson } from '../../api/client';
import { showImagePickerAlert } from '../../utils/imagePicker';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { PremiumInput } from '../../components/premium/PremiumInput';
import { StepIndicator } from '../../components/premium/StepIndicator';
import { showToast } from '../../components/premium/Toast';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;
type RegisterRoute = RouteProp<RootStackParamList, 'Register'>;
type UsernameStatus = 'idle' | 'too_short' | 'invalid' | 'checking' | 'available' | 'taken';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,}$/;
const USERNAME_RULE = /^[a-z0-9çğıöşü_.-]+$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RULE = /^[+]?[\d\s()-]{7,20}$/;

type Step = 0 | 1 | 2;

export function RegisterScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height <= 860;
  const navigation = useNavigation<Nav>();
  const route = useRoute<RegisterRoute>();
  const {
    tenant,
    subdomain,
    setSubdomain,
    tenantDirectory,
    loadingTenantDir,
    loadingAuth,
    resolveTenantByCode,
    loadTenantDirectory,
    clearClubSelection,
    registerWithFullName,
  } = useMemberAuth();

  // --- Form State ---
  const [step, setStep] = useState<Step>(0);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [clubQuery, setClubQuery] = useState('');

  // --- Inline Validation (touched state) ---
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const markTouched = useCallback((field: string) => {
    setTouchedFields((prev) => new Set(prev).add(field));
  }, []);

  const successAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  // --- Validation Errors ---
  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    // Step 0
    e.fullName = !fullName.trim() ? t('register.fullNameRequired') : null;
    const normalizedUsername = username.trim().toLocaleLowerCase('tr-TR');
    if (!normalizedUsername) e.username = t('register.usernameRequired');
    else if (normalizedUsername.length < 3) e.username = t('register.usernameMinLength');
    else if (!USERNAME_RULE.test(normalizedUsername)) e.username = t('register.usernameInvalid');
    else if (usernameStatus === 'taken') e.username = t('register.usernameTaken');
    else e.username = null;
    // Step 2
    e.email = !email.trim()
      ? t('register.emailRequired')
      : !EMAIL_RULE.test(email.trim())
        ? t('register.emailInvalid')
        : null;
    e.phone = phone.trim() && !PHONE_RULE.test(phone.trim()) ? t('register.phoneInvalid') : null;
    e.password = !password
      ? t('register.passwordRequired')
      : !PASSWORD_RULE.test(password)
        ? t('register.passwordRules')
        : null;
    return e;
  }, [fullName, username, usernameStatus, email, phone, password, t]);

  const step0Valid =
    !errors.fullName &&
    !errors.username &&
    usernameStatus !== 'checking' &&
    usernameStatus !== 'taken';
  const step2Valid =
    !errors.email && !errors.phone && !errors.password && acceptPrivacy && acceptTerms;

  // --- Username availability check ---
  useEffect(() => {
    const normalized = username.trim().toLocaleLowerCase('tr-TR');
    if (!normalized || normalized.length < 3 || !USERNAME_RULE.test(normalized)) {
      if (normalized.length < 3 && normalized.length > 0) setUsernameStatus('too_short');
      else if (normalized && !USERNAME_RULE.test(normalized)) setUsernameStatus('invalid');
      else setUsernameStatus('idle');
      setUsernameSuggestions([]);
      return;
    }
    // Kulüp seçilmemişse availability check yapma (backend tenant gerektirir)
    const tenantSub = tenant?.subdomain;
    if (!tenantSub) {
      setUsernameStatus('available');
      setUsernameSuggestions([]);
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    const timer = setTimeout(() => {
      apiJson<{ available: boolean; suggestions?: string[]; reason?: string }>(
        `/auth/username-availability?tenantSubdomain=${encodeURIComponent(tenantSub)}&username=${encodeURIComponent(normalized)}`,
        { auth: false },
      )
        .then((res) => {
          if (cancelled) return;
          if (res.available) {
            setUsernameStatus('available');
            setUsernameSuggestions([]);
          } else {
            setUsernameStatus('taken');
            setUsernameSuggestions(res.suggestions ?? []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUsernameStatus('available');
            setUsernameSuggestions([]);
          }
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tenant?.subdomain, username]);

  // --- Preselected subdomain from route ---
  useEffect(() => {
    const pre = route.params?.preselectedSubdomain?.trim().toLowerCase();
    if (pre) {
      setSubdomain(pre);
      resolveTenantByCode(pre, true).catch(() => {});
    }
  }, [route.params?.preselectedSubdomain, resolveTenantByCode, setSubdomain]);

  // --- Success modal animation ---
  useEffect(() => {
    if (!showSuccessModal) {
      successAnim.setValue(0);
      return;
    }
    Animated.timing(successAnim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [showSuccessModal, successAnim]);

  // --- Photo upload ---
  // --- Photo upload ---
  const uploadPhoto = () => {
    setUploadingPhoto(true);
    showImagePickerAlert(
      (url) => {
        setPhotoUrl(url);
        setUploadingPhoto(false);
        showToast(t('register.photoUploaded'), 'success', 2000);
      },
      () => {
        setUploadingPhoto(false);
        showToast(t('register.photoUploadFailed'), 'error');
      },
    );
  };

  // --- Navigation ---
  const goNext = () => {
    if (step === 0 && !step0Valid) {
      setTouchedFields(new Set(['fullName', 'username']));
      showToast(t('register.fixErrors'), 'warning');
      return;
    }
    if (step < 2) {
      setStep((s) => (s + 1) as Step);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep((s) => (s - 1) as Step);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ClubConnect');
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!step2Valid) {
      setTouchedFields(new Set(['email', 'phone', 'password']));
      showToast(t('register.fixErrors'), 'warning');
      return;
    }
    if (!tenant && subdomain.trim()) {
      const ok = await resolveTenantByCode(subdomain.trim());
      if (!ok) return;
    }
    const result = await registerWithFullName(fullName, username, email, phone, password, photoUrl);
    if (result === 'pending') setShowSuccessModal(true);
  };

  // --- Club directory ---
  const filteredDirectory = useMemo(() => {
    const q = clubQuery.trim().toLowerCase();
    if (!q) return tenantDirectory;
    return tenantDirectory.filter(
      (r) => r.name.toLowerCase().includes(q) || r.subdomain.toLowerCase().includes(q),
    );
  }, [clubQuery, tenantDirectory]);

  // --- Render ---
  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={[styles.root, { paddingTop: insets.top + (compact ? 8 : 16) }]}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Pressable style={styles.backBtn} onPress={goBack}>
            <Text style={styles.backTxt}>
              {step > 0 ? '← ' + t('common.back') : t('common.back')}
            </Text>
          </Pressable>

          <StepIndicator currentStep={step} totalSteps={3} labels={STEP_LABELS} />

          <GlassCard style={[styles.card, compact && styles.cardCompact]}>
            {/* ═══════════ STEP 0: Profil ═══════════ */}
            {step === 0 && (
              <>
                <Text style={styles.stepTitle}>👤 {t('register.stepProfile')}</Text>
                <Text style={styles.stepDesc}>{t('register.stepProfileDesc')}</Text>

                {/* Avatar */}
                <View style={styles.avatarSection}>
                  <Pressable
                    style={styles.avatarRing}
                    onPress={uploadPhoto}
                    disabled={uploadingPhoto}
                  >
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarPlus}>+</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.avatarCta}
                    onPress={uploadPhoto}
                    disabled={uploadingPhoto}
                  >
                    <Text style={styles.avatarCtaTxt}>
                      {uploadingPhoto
                        ? t('register.photoUploading')
                        : photoUrl
                          ? t('register.photoChange')
                          : t('register.photoUpload')}
                    </Text>
                  </Pressable>
                </View>

                <PremiumInput
                  label={t('onboarding.fullName')}
                  value={fullName}
                  onChangeText={setFullName}
                  onBlur={() => markTouched('fullName')}
                  autoCapitalize="words"
                  placeholder={t('onboarding.fullNamePh')}
                  error={touchedFields.has('fullName') ? errors.fullName : null}
                />

                <PremiumInput
                  label={t('register.usernameLabel')}
                  value={username}
                  onChangeText={setUsername}
                  onBlur={() => markTouched('username')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('register.usernamePh')}
                  error={touchedFields.has('username') ? errors.username : null}
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
                />

                {usernameSuggestions.length > 0 && (
                  <View style={styles.suggestionsWrap}>
                    <Text style={styles.suggestionsLabel}>{t('register.usernameSuggestions')}</Text>
                    <View style={styles.suggestionsRow}>
                      {usernameSuggestions.map((item) => (
                        <Pressable
                          key={item}
                          style={styles.suggestionChip}
                          onPress={() => setUsername(item)}
                        >
                          <Text style={styles.suggestionChipTxt}>{item}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.nextBtn,
                    pressed && styles.nextBtnPressed,
                    !step0Valid && styles.nextBtnDisabled,
                  ]}
                  onPress={goNext}
                >
                  <Text style={styles.nextBtnTxt}>{t('register.next')}</Text>
                  <Text style={styles.nextBtnArrow}>→</Text>
                </Pressable>
              </>
            )}

            {/* ═══════════ STEP 1: Kulüp ═══════════ */}
            {step === 1 && (
              <>
                <Text style={styles.stepTitle}>🏢 {t('register.stepClub')}</Text>
                <Text style={styles.stepDesc}>{t('register.stepClubDesc')}</Text>

                <Text style={styles.clubOptionalInfo}>{t('registration.memberOptionalClub')}</Text>

                <Pressable
                  style={({ pressed }) => [styles.clubBtn, pressed && styles.clubBtnPressed]}
                  onPress={() => {
                    setListOpen(!listOpen);
                    if (!listOpen) loadTenantDirectory().catch(() => {});
                  }}
                  disabled={loadingTenantDir}
                >
                  {loadingTenantDir ? (
                    <ActivityIndicator color={premium.accentBlue} />
                  ) : (
                    <Text style={styles.clubBtnTxt}>
                      {tenant?.name ?? t('registration.selectClubOptional')}
                    </Text>
                  )}
                </Pressable>

                {listOpen && (
                  <View style={styles.clubList}>
                    <PremiumInput
                      label={t('tenant.searchLabel')}
                      value={clubQuery}
                      onChangeText={setClubQuery}
                      autoCapitalize="none"
                      placeholder={t('tenant.searchPlaceholder')}
                    />
                    <ScrollView style={styles.clubListScroll} nestedScrollEnabled>
                      {filteredDirectory.map((row) => (
                        <Pressable
                          key={row.id}
                          style={styles.clubRow}
                          onPress={() => {
                            resolveTenantByCode(row.subdomain).catch(() => {});
                            setListOpen(false);
                            setClubQuery('');
                          }}
                        >
                          <Text style={styles.clubRowName}>{row.name}</Text>
                          <Text style={styles.clubRowCode}>{row.subdomain}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <PremiumInput
                  label={t('tenant.subdomainLabel')}
                  value={subdomain}
                  onChangeText={setSubdomain}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('tenant.placeholder')}
                />

                {tenant && (
                  <View style={styles.tenantConfirm}>
                    <Text style={styles.tenantConfirmIcon}>✓</Text>
                    <Text style={styles.tenantConfirmTxt}>{tenant.name}</Text>
                    <Pressable
                      onPress={() => {
                        clearClubSelection();
                        setSubdomain('');
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.tenantClearTxt}>×</Text>
                    </Pressable>
                  </View>
                )}

                <View style={styles.navRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.backStepBtn,
                      pressed && styles.backStepBtnPressed,
                    ]}
                    onPress={goBack}
                  >
                    <Text style={styles.backStepTxt}>← {t('common.back')}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.nextBtn,
                      styles.nextBtnFlex,
                      pressed && styles.nextBtnPressed,
                    ]}
                    onPress={goNext}
                  >
                    <Text style={styles.nextBtnTxt}>
                      {tenant ? t('register.next') : t('register.skipClub')}
                    </Text>
                    <Text style={styles.nextBtnArrow}>→</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* ═══════════ STEP 2: Hesap ═══════════ */}
            {step === 2 && (
              <>
                <Text style={styles.stepTitle}>🔐 {t('register.stepAccount')}</Text>
                <Text style={styles.stepDesc}>{t('register.stepAccountDesc')}</Text>

                <PremiumInput
                  label={t('register.phoneLabel')}
                  value={phone}
                  onChangeText={setPhone}
                  onBlur={() => markTouched('phone')}
                  keyboardType="phone-pad"
                  placeholder={t('register.phonePh')}
                  error={touchedFields.has('phone') ? errors.phone : null}
                />

                <PremiumInput
                  label={t('login.emailLabel')}
                  value={email}
                  onChangeText={setEmail}
                  onBlur={() => markTouched('email')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder={t('login.emailPh')}
                  error={touchedFields.has('email') ? errors.email : null}
                />

                <PremiumInput
                  label={t('login.passwordLabel')}
                  value={password}
                  onChangeText={setPassword}
                  onBlur={() => markTouched('password')}
                  secureTextEntry={!showPassword}
                  placeholder={t('login.passwordPh')}
                  error={touchedFields.has('password') ? errors.password : null}
                  rightSlot={
                    <Pressable onPress={() => setShowPassword((p) => !p)}>
                      <Text style={styles.eyeTxt}>
                        {showPassword ? t('common.hide') : t('common.show')}
                      </Text>
                    </Pressable>
                  }
                />

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    <View
                      style={[styles.strengthBar, password.length >= 4 && styles.strengthWeak]}
                    />
                    <View
                      style={[
                        styles.strengthBar,
                        password.length >= 6 && /[A-Z]/.test(password) && styles.strengthMedium,
                      ]}
                    />
                    <View
                      style={[
                        styles.strengthBar,
                        PASSWORD_RULE.test(password) && styles.strengthStrong,
                      ]}
                    />
                    <Text style={styles.strengthLabel}>
                      {PASSWORD_RULE.test(password)
                        ? '💪 ' + t('register.strengthStrong')
                        : password.length >= 6
                          ? '⚡ ' + t('register.strengthMedium')
                          : '⚠️ ' + t('register.strengthWeak')}
                    </Text>
                  </View>
                )}

                {/* Checkboxes */}
                <Pressable style={styles.checkRow} onPress={() => setAcceptPrivacy((v) => !v)}>
                  <View style={[styles.checkBox, acceptPrivacy && styles.checkBoxOn]}>
                    {acceptPrivacy && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkTxt}>{t('register.acceptPrivacy')}</Text>
                </Pressable>

                <Pressable style={styles.checkRow} onPress={() => setAcceptTerms((v) => !v)}>
                  <View style={[styles.checkBox, acceptTerms && styles.checkBoxOn]}>
                    {acceptTerms && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkTxt}>{t('register.acceptTerms')}</Text>
                </Pressable>

                <View style={styles.navRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.backStepBtn,
                      pressed && styles.backStepBtnPressed,
                    ]}
                    onPress={goBack}
                  >
                    <Text style={styles.backStepTxt}>← {t('common.back')}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.submitBtn,
                      pressed && styles.submitBtnPressed,
                      (!step2Valid || loadingAuth) && styles.submitBtnDisabled,
                    ]}
                    onPress={() => {
                      handleSubmit().catch(() => {});
                    }}
                    disabled={loadingAuth}
                  >
                    {loadingAuth ? (
                      <ActivityIndicator color={premium.accentBlue} />
                    ) : (
                      <Text style={styles.submitTxt}>{t('register.submit')}</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      {showSuccessModal && (
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                opacity: successAnim,
                transform: [
                  {
                    scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.modalEmoji}>🎉</Text>
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
      )}
    </GradientBackground>
  );
}

const STEP_LABELS = ['Profil', 'Kulüp', 'Hesap'];

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { paddingHorizontal: 22, maxWidth: 440, width: '100%', alignSelf: 'center' },
  scrollContent: { flexGrow: 1 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 2, marginBottom: 6 },
  backTxt: { color: premium.textMuted, fontSize: 14, fontWeight: '700' },
  card: { marginTop: 8 },
  cardCompact: { marginTop: 4, paddingVertical: 14 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: premium.text, marginBottom: 4 },
  stepDesc: { fontSize: 14, color: premium.textMuted, marginBottom: 16, lineHeight: 20 },
  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 14 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: premium.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlus: { color: premium.accentBlue, fontSize: 30, fontWeight: '300' },
  avatarCta: { marginTop: 8, paddingVertical: 4 },
  avatarCtaTxt: { color: premium.accentBlue, fontSize: 13, fontWeight: '700' },
  // Username
  okMark: { color: premium.accentGreen, fontSize: 18, fontWeight: '800' },
  errMark: { color: premium.danger, fontSize: 16, fontWeight: '800' },
  suggestionsWrap: { marginTop: -8, marginBottom: 12 },
  suggestionsLabel: { color: premium.textMuted, fontSize: 12, marginBottom: 6 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  suggestionChipTxt: { color: premium.accentBlue, fontSize: 12, fontWeight: '600' },
  // Club
  clubOptionalInfo: { color: premium.accentBlue, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  clubBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  clubBtnPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  clubBtnTxt: { color: premium.text, fontSize: 14, fontWeight: '700' },
  clubList: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    padding: 8,
    marginBottom: 10,
    backgroundColor: 'rgba(4,13,24,0.98)',
  },
  clubListScroll: { maxHeight: 200 },
  clubRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  clubRowName: { color: premium.text, fontSize: 14, fontWeight: '600' },
  clubRowCode: { color: premium.textMuted, fontSize: 12, marginTop: 2 },
  tenantConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  tenantConfirmIcon: { color: premium.accentGreen, fontSize: 16, fontWeight: '800' },
  tenantConfirmTxt: { flex: 1, color: premium.text, fontSize: 14, fontWeight: '600' },
  tenantClearTxt: { color: premium.textMuted, fontSize: 20, fontWeight: '700' },
  // Password strength
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -8,
    marginBottom: 12,
  },
  strengthBar: { height: 4, flex: 1, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  strengthWeak: { backgroundColor: premium.danger },
  strengthMedium: { backgroundColor: '#fbbf24' },
  strengthStrong: { backgroundColor: premium.accentGreen },
  strengthLabel: { fontSize: 11, color: premium.textMuted, fontWeight: '600', marginLeft: 6 },
  // Checkboxes
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
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
  checkBoxOn: { borderColor: premium.accentGreen, backgroundColor: 'rgba(16,185,129,0.2)' },
  checkMark: { color: premium.accentGreen, fontSize: 13, fontWeight: '800' },
  checkTxt: { flex: 1, color: premium.textMuted, fontSize: 12, lineHeight: 17 },
  // Navigation
  navRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  nextBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  nextBtnFlex: {},
  nextBtnPressed: { backgroundColor: 'rgba(56,189,248,0.18)' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnTxt: { color: premium.accentBlue, fontSize: 16, fontWeight: '700' },
  nextBtnArrow: { color: premium.accentBlue, fontSize: 18, fontWeight: '700' },
  backStepBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backStepBtnPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  backStepTxt: { color: premium.textMuted, fontSize: 14, fontWeight: '700' },
  submitBtn: {
    borderWidth: 1,
    borderColor: premium.accentBlue,
    borderRadius: premium.radiusSm,
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  submitBtnPressed: { backgroundColor: 'rgba(56,189,248,0.25)' },
  submitBtnDisabled: { opacity: 0.4 },
  submitTxt: { color: premium.accentBlue, fontSize: 17, fontWeight: '800' },
  eyeTxt: { color: premium.textMuted, fontSize: 13, fontWeight: '700' },
  // Modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    width: '100%',
    borderRadius: premium.radiusLg,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(5,16,28,0.96)',
    padding: 24,
    alignItems: 'center',
  },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: {
    color: premium.accentGreen,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBody: {
    color: premium.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: 'center',
  },
  modalBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  modalBtnTxt: { color: premium.accentBlue, fontSize: 17, fontWeight: '700' },
});
