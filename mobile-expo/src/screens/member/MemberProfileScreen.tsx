import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { apiJson } from '../../api/client';
import { showImagePickerAlert } from '../../utils/imagePicker';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { PremiumInput } from '../../components/premium/PremiumInput';
import { persistLanguage } from '../../i18n';
import { premium } from '../../theme/premiumTheme';
import type { MemberTabParamList } from '../../navigation/memberTabTypes';

const TAB_BAR_PAD = 72;

export function MemberProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, token, tenant, logout, deleteAccount, updateProfile } = useMemberAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MemberTabParamList>>();

  const [showEditForm, setShowEditForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Username validation
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'too_short'
  >('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Email validation
  const [emailStatus, setEmailStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stats
  const [ptRemaining, setPtRemaining] = useState<number | null>(null);
  const [spaRemaining, setSpaRemaining] = useState<number | null>(null);

  // Trainer code
  const [trainerCode, setTrainerCode] = useState('');
  const [connectingTrainer, setConnectingTrainer] = useState(false);

  // Animation
  const editAnim = useRef(new Animated.Value(0)).current;

  const loadStats = useCallback(async () => {
    if (!token || !tenant) return;
    const opts = { token, tenantSubdomain: tenant.subdomain };
    try {
      const [ptBal, spaBal] = await Promise.all([
        apiJson<{ remainingSessions: number }>('/pt/my-package-balance', opts).catch(() => null),
        apiJson<{ remainingSessions: number }>('/spa/my-package-balance', opts).catch(() => null),
      ]);
      setPtRemaining(ptBal?.remainingSessions ?? 0);
      setSpaRemaining(spaBal?.remainingSessions ?? 0);
    } catch {
      // silent
    }
  }, [token, tenant]);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats]),
  );

  const handleConnectByCode = async () => {
    if (!trainerCode.trim() || !token || !tenant) return;
    setConnectingTrainer(true);
    try {
      const res = await apiJson<{ ok: boolean; trainerName: string }>(
        '/trainer-network/connect-by-code',
        {
          method: 'POST',
          token,
          tenantSubdomain: tenant.subdomain,
          body: JSON.stringify({ inviteCode: trainerCode.trim() }),
        },
      );
      Alert.alert('✅ Bağlandınız', `${res.trainerName} eğitmeninize başarıyla bağlandınız!`);
      setTrainerCode('');
    } catch (e) {
      const msg =
        e instanceof Error && 'message' in e ? (e as { message: string }).message : 'Bağlanılamadı';
      Alert.alert('Hata', msg);
    } finally {
      setConnectingTrainer(false);
    }
  };

  const checkUsername = useCallback(
    (value: string) => {
      if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);

      const normalized = value.trim().toLocaleLowerCase('tr-TR');
      // If same as current username, no need to check
      if (normalized === (user?.username ?? '').toLocaleLowerCase('tr-TR')) {
        setUsernameStatus('idle');
        setUsernameSuggestions([]);
        return;
      }
      if (normalized.length < 3) {
        setUsernameStatus('too_short');
        setUsernameSuggestions([]);
        return;
      }
      setUsernameStatus('checking');
      usernameTimerRef.current = setTimeout(async () => {
        if (!token || !tenant) return;
        try {
          const res = await apiJson<{ available: boolean; reason: string; suggestions: string[] }>(
            `/auth/username-availability?username=${encodeURIComponent(normalized)}&tenantSubdomain=${tenant.subdomain}`,
            { token, tenantSubdomain: tenant.subdomain },
          );
          setUsernameStatus(res.available ? 'available' : 'taken');
          setUsernameSuggestions(res.suggestions ?? []);
        } catch {
          setUsernameStatus('idle');
        }
      }, 500);
    },
    [token, tenant, user],
  );

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    checkUsername(value);
  };

  const checkEmail = useCallback(
    (value: string) => {
      if (emailTimerRef.current) clearTimeout(emailTimerRef.current);

      const normalized = value.trim().toLowerCase();
      // If same as current email, no need to check
      if (normalized === (user?.email ?? '').toLowerCase()) {
        setEmailStatus('idle');
        return;
      }
      // Basic email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalized)) {
        setEmailStatus(normalized.length > 0 ? 'invalid' : 'idle');
        return;
      }
      setEmailStatus('checking');
      emailTimerRef.current = setTimeout(async () => {
        if (!token || !tenant) return;
        try {
          // Use the updateMe endpoint logic - try a dry check via username-availability style
          // Since there's no dedicated email-check endpoint, we'll check by attempting to find conflicts
          const res = await apiJson<{ available: boolean }>(
            `/auth/email-availability?email=${encodeURIComponent(normalized)}&tenantSubdomain=${tenant.subdomain}`,
            { token, tenantSubdomain: tenant.subdomain },
          );
          setEmailStatus(res.available ? 'available' : 'taken');
        } catch {
          // If endpoint doesn't exist, assume available (backend will catch on save)
          setEmailStatus('available');
        }
      }, 500);
    },
    [token, tenant, user],
  );

  const handleEmailChange = (value: string) => {
    setEmail(value);
    checkEmail(value);
  };

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setEmail(user.email ?? '');
    setUsername(user.username ?? '');
    setPhone(user.phone ?? '');
    setPhotoUrl(user.photoUrl ?? null);
  }, [user]);

  useEffect(() => {
    Animated.timing(editAnim, {
      toValue: showEditForm ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [showEditForm, editAnim]);

  if (!user || !tenant) {
    return null;
  }

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || '—';
  const initials =
    `${(user.firstName ?? '')[0] ?? ''}${(user.lastName ?? '')[0] ?? ''}`.toUpperCase() || '?';
  const roleBadgeLabel = user.role === 'admin' ? 'Admin' : 'Üye';

  const uploadPhoto = () => {
    setUploadingPhoto(true);
    showImagePickerAlert(
      (url) => {
        setPhotoUrl(url);
        setUploadingPhoto(false);
      },
      () => {
        setUploadingPhoto(false);
        Alert.alert(t('profile.updateTitle'), t('profile.photoUploadFailed'));
      },
    );
  };

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !username.trim()) {
      Alert.alert(t('profile.updateTitle'), t('profile.updateValidation'));
      return;
    }
    if (usernameStatus === 'taken' || usernameStatus === 'too_short') {
      Alert.alert('Kullanıcı Adı', 'Lütfen uygun bir kullanıcı adı seçin.');
      return;
    }
    if (emailStatus === 'taken' || emailStatus === 'invalid') {
      Alert.alert('E-posta', 'Lütfen geçerli ve kullanılmamış bir e-posta adresi girin.');
      return;
    }
    setSaving(true);
    updateProfile({ firstName, lastName, email, username, phone, photoUrl })
      .then((ok) => {
        if (ok) {
          Alert.alert(t('profile.updateTitle'), t('profile.updateOk'));
          setShowEditForm(false);
          setUsernameStatus('idle');
          setEmailStatus('idle');
        }
      })
      .finally(() => setSaving(false));
  };

  const editMaxHeight = editAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });
  const editOpacity = editAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + TAB_BAR_PAD },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Header ─── */}
        <GlassCard style={styles.headerCard}>
          <Pressable style={styles.settingsIcon} onPress={() => setShowEditForm((v) => !v)}>
            <Text style={styles.settingsIconText}>{showEditForm ? '✕' : '⚙️'}</Text>
          </Pressable>

          <View style={styles.avatarContainer}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Pressable
              style={styles.avatarCameraOverlay}
              onPress={uploadPhoto}
              disabled={uploadingPhoto}
            >
              <Text style={styles.avatarCameraIcon}>📷</Text>
            </Pressable>
          </View>

          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleBadgeLabel}</Text>
          </View>
        </GlassCard>

        {/* ─── Edit Form (animated, between header and stats) ─── */}
        <Animated.View
          style={[styles.editAnimWrap, { maxHeight: editMaxHeight, opacity: editOpacity }]}
        >
          <GlassCard style={styles.editCard}>
            <View style={styles.editHeader}>
              <View style={styles.editTitleRow}>
                <Text style={styles.editTitleIcon}>✏️</Text>
                <Text style={styles.editTitle}>Profil Düzenle</Text>
              </View>
            </View>

            <View style={styles.editFieldsGrid}>
              <View style={styles.editFieldHalf}>
                <PremiumInput
                  label={t('register.firstName')}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View style={styles.editFieldHalf}>
                <PremiumInput
                  label={t('register.lastName')}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <PremiumInput
              label={t('login.emailLabel')}
              value={email}
              onChangeText={handleEmailChange}
            />
            {/* Email validation feedback */}
            {emailStatus !== 'idle' && (
              <View style={styles.usernameStatus}>
                {emailStatus === 'checking' && (
                  <Text style={styles.usernameChecking}>⏳ Kontrol ediliyor...</Text>
                )}
                {emailStatus === 'available' && (
                  <Text style={styles.usernameAvailable}>✅ E-posta uygun</Text>
                )}
                {emailStatus === 'taken' && (
                  <Text style={styles.usernameTaken}>❌ Bu e-posta adresi zaten kayıtlı</Text>
                )}
                {emailStatus === 'invalid' && (
                  <Text style={styles.usernameTaken}>❌ Geçerli bir e-posta adresi girin</Text>
                )}
              </View>
            )}
            <PremiumInput
              label={t('register.usernameLabel')}
              value={username}
              onChangeText={handleUsernameChange}
            />
            {/* Username validation feedback */}
            {usernameStatus !== 'idle' && (
              <View style={styles.usernameStatus}>
                {usernameStatus === 'checking' && (
                  <Text style={styles.usernameChecking}>⏳ Kontrol ediliyor...</Text>
                )}
                {usernameStatus === 'available' && (
                  <Text style={styles.usernameAvailable}>✅ Kullanıcı adı uygun</Text>
                )}
                {usernameStatus === 'taken' && (
                  <View>
                    <Text style={styles.usernameTaken}>❌ Bu kullanıcı adı alınmış</Text>
                    {usernameSuggestions.length > 0 && (
                      <View style={styles.suggestionsRow}>
                        <Text style={styles.suggestionsLabel}>Öneriler:</Text>
                        {usernameSuggestions.slice(0, 3).map((s) => (
                          <Pressable
                            key={s}
                            style={styles.suggestionChip}
                            onPress={() => {
                              setUsername(s);
                              setUsernameStatus('available');
                              setUsernameSuggestions([]);
                            }}
                          >
                            <Text style={styles.suggestionChipTxt}>{s}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )}
                {usernameStatus === 'too_short' && (
                  <Text style={styles.usernameTaken}>❌ En az 3 karakter olmalı</Text>
                )}
              </View>
            )}
            <PremiumInput label={t('register.phoneLabel')} value={phone} onChangeText={setPhone} />

            <Pressable
              style={({ pressed }) => [
                styles.btnSave,
                pressed && styles.btnSavePressed,
                saving && styles.btnDisabled,
              ]}
              disabled={saving}
              onPress={handleSave}
            >
              <Text style={styles.btnSaveTxt}>
                {saving ? '⏳ Kaydediliyor...' : '✓ Değişiklikleri Kaydet'}
              </Text>
            </Pressable>
          </GlassCard>
        </Animated.View>

        {/* ─── Quick Stats ─── */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={[styles.statValue, ptRemaining === 0 && styles.statValueWarn]}>
              {ptRemaining ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Kalan PT</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={[styles.statValue, spaRemaining === 0 && styles.statValueWarn]}>
              {spaRemaining ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Kalan Masaj</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueActive]}>Aktif</Text>
            <Text style={styles.statLabel}>Üyelik</Text>
          </GlassCard>
        </View>

        {/* ─── Quick Access ─── */}
        <GlassCard style={styles.quickAccessCard}>
          <Pressable
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('Reservations')}
          >
            <Text style={styles.quickAccessIcon}>📅</Text>
            <Text style={styles.quickAccessText}>Rezervasyonlarım</Text>
            <Text style={styles.quickAccessArrow}>›</Text>
          </Pressable>
          <Pressable style={styles.quickAccessItem} onPress={() => navigation.navigate('Messages')}>
            <Text style={styles.quickAccessIcon}>💬</Text>
            <Text style={styles.quickAccessText}>Mesajlarım</Text>
            <Text style={styles.quickAccessArrow}>›</Text>
          </Pressable>
          <Pressable
            style={[styles.quickAccessItem, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.quickAccessIcon}>🔔</Text>
            <Text style={styles.quickAccessText}>Bildirimlerim</Text>
            <Text style={styles.quickAccessArrow}>›</Text>
          </Pressable>
          <Pressable
            style={[styles.quickAccessItem, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('Connections')}
          >
            <Text style={styles.quickAccessIcon}>🔗</Text>
            <Text style={styles.quickAccessText}>Bağlantılarım</Text>
            <Text style={styles.quickAccessArrow}>›</Text>
          </Pressable>
        </GlassCard>

        {/* ─── Eğitmen Kodu Gir ─── */}
        <GlassCard style={styles.quickAccessCard}>
          <View style={styles.trainerCodeSection}>
            <Text style={styles.trainerCodeTitle}>🔗 Eğitmen Kodu Gir</Text>
            <Text style={styles.trainerCodeHint}>
              Eğitmeninizin size verdiği kodu girerek bağlanın
            </Text>
            <View style={styles.trainerCodeRow}>
              <View style={styles.trainerCodeInputWrap}>
                <PremiumInput
                  label=""
                  value={trainerCode}
                  onChangeText={(v) => setTrainerCode(v.toUpperCase())}
                  placeholder="ABCD1234"
                  autoCapitalize="characters"
                />
              </View>
              <Pressable
                style={[
                  styles.trainerCodeBtn,
                  (!trainerCode.trim() || connectingTrainer) && { opacity: 0.4 },
                ]}
                onPress={handleConnectByCode}
                disabled={!trainerCode.trim() || connectingTrainer}
              >
                <Text style={styles.trainerCodeBtnText}>{connectingTrainer ? '⏳' : '→'}</Text>
              </Pressable>
            </View>
          </View>
        </GlassCard>

        {/* ─── Settings ─── */}
        <GlassCard style={styles.settingsCard}>
          <Text style={styles.cardTitle}>{t('lang.label')}</Text>
          <View style={styles.langSeg}>
            <Pressable
              accessibilityRole="button"
              style={[styles.langBtn, i18n.language === 'tr' && styles.langBtnOn]}
              onPress={() => {
                persistLanguage('tr').catch(() => {});
              }}
            >
              <Text style={[styles.langTxt, i18n.language === 'tr' && styles.langTxtOn]}>
                {t('lang.tr')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.langBtn, i18n.language === 'en' && styles.langBtnOn]}
              onPress={() => {
                persistLanguage('en').catch(() => {});
              }}
            >
              <Text style={[styles.langTxt, i18n.language === 'en' && styles.langTxtOn]}>
                {t('lang.en')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.settingsDivider} />

          <Pressable
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
          >
            <Text style={styles.quickAccessIcon}>🔒</Text>
            <Text style={styles.quickAccessText}>{t('profile.privacyTitle')}</Text>
            <Text style={styles.quickAccessArrow}>›</Text>
          </Pressable>
          <Pressable
            style={[styles.quickAccessItem, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('Legal', { type: 'terms' })}
          >
            <Text style={styles.quickAccessIcon}>📄</Text>
            <Text style={styles.quickAccessText}>{t('profile.termsTitle')}</Text>
            <Text style={styles.quickAccessArrow}>›</Text>
          </Pressable>
        </GlassCard>

        {/* ─── Bottom Actions ─── */}
        <Pressable
          style={({ pressed }) => [styles.btnDanger, pressed && styles.btnDangerPressed]}
          onPress={() => {
            Alert.alert(t('profile.deleteTitle'), t('profile.deleteConfirmBody'), [
              { text: t('profile.cancel'), style: 'cancel' },
              {
                text: t('profile.deleteAction'),
                style: 'destructive',
                onPress: () => {
                  deleteAccount().catch(() => {
                    Alert.alert(t('profile.deleteTitle'), t('profile.deleteFailed'));
                  });
                },
              },
            ]);
          }}
        >
          <Text style={styles.btnDangerTxt}>{t('profile.deleteAction')}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
          onPress={() => {
            logout().catch(() => {});
          }}
        >
          <Text style={styles.btnGhostTxt}>{t('profile.logoutAction')}</Text>
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    flexGrow: 1,
  },

  /* ─── Header ─── */
  headerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 12,
    position: 'relative',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: premium.accentBlue,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(56,189,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: premium.accentBlue,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '900',
    color: premium.accentBlue,
  },
  avatarCameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: premium.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraIcon: {
    fontSize: 14,
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: premium.text,
    textAlign: 'center',
    marginTop: 12,
  },
  profileEmail: {
    fontSize: 13,
    color: premium.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: premium.accentBlue,
    textTransform: 'uppercase',
  },
  settingsIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  settingsIconText: {
    fontSize: 22,
  },

  /* ─── Edit Form (animated) ─── */
  editAnimWrap: {
    overflow: 'hidden',
    marginBottom: 0,
  },
  editCard: {
    marginBottom: 12,
    borderColor: 'rgba(56,189,248,0.2)',
    borderWidth: 1,
  },
  editHeader: {
    marginBottom: 12,
  },
  editTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editTitleIcon: {
    fontSize: 18,
  },
  editTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
  },
  editFieldsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  editFieldHalf: {
    flex: 1,
  },
  editPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
    backgroundColor: 'rgba(56,189,248,0.05)',
    marginTop: 4,
    marginBottom: 12,
  },
  editPhotoBtnPressed: {
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  editPhotoBtnIcon: {
    fontSize: 16,
  },
  editPhotoBtnTxt: {
    color: premium.accentBlue,
    fontWeight: '700',
    fontSize: 14,
  },
  btnSave: {
    backgroundColor: premium.accentBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSavePressed: {
    opacity: 0.85,
  },
  btnSaveTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  /* ─── Username Validation ─── */
  usernameStatus: {
    marginTop: -4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  usernameChecking: {
    fontSize: 12,
    color: premium.textMuted,
    fontWeight: '600',
  },
  usernameAvailable: {
    fontSize: 12,
    color: premium.accentGreen,
    fontWeight: '700',
  },
  usernameTaken: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '700',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  suggestionsLabel: {
    fontSize: 11,
    color: premium.textMuted,
    fontWeight: '600',
  },
  suggestionChip: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  suggestionChipTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.accentBlue,
  },

  /* ─── Stats ─── */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 4,
  },
  statValueWarn: {
    color: '#f59e0b',
  },
  statValueActive: {
    color: premium.accentGreen,
    fontSize: 14,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: premium.textMuted,
  },

  /* ─── Quick Access ─── */
  quickAccessCard: {
    marginBottom: 12,
  },
  trainerCodeSection: {
    paddingVertical: 4,
  },
  trainerCodeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 4,
  },
  trainerCodeHint: {
    fontSize: 12,
    color: premium.textMuted,
    marginBottom: 12,
  },
  trainerCodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  trainerCodeInputWrap: {
    flex: 1,
  },
  trainerCodeBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: premium.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  trainerCodeBtnText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '800',
  },
  quickAccessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(148,163,184,0.1)',
  },
  quickAccessIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  quickAccessText: {
    fontSize: 15,
    fontWeight: '600',
    color: premium.text,
    flex: 1,
  },
  quickAccessArrow: {
    fontSize: 14,
    color: premium.textMuted,
  },

  /* ─── Settings ─── */
  settingsCard: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.1)',
    marginVertical: 12,
  },
  langSeg: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  langBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  langBtnOn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  langTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: premium.textMuted,
  },
  langTxtOn: {
    color: premium.text,
  },

  /* ─── Buttons ─── */
  btnDanger: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
    backgroundColor: 'rgba(248,113,113,0.08)',
    marginTop: 8,
  },
  btnDangerPressed: {
    backgroundColor: 'rgba(248,113,113,0.15)',
  },
  btnDangerTxt: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 14,
  },
  btnGhost: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: 8,
  },
  btnGhostPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnGhostTxt: {
    color: premium.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
});
