import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  // Stats
  const [ptRemaining, setPtRemaining] = useState<number | null>(null);
  const [spaRemaining, setSpaRemaining] = useState<number | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) {
      return;
    }
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setEmail(user.email ?? '');
    setUsername(user.username ?? '');
    setPhone(user.phone ?? '');
    setPhotoUrl(user.photoUrl ?? null);
  }, [user]);

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
    setSaving(true);
    updateProfile({ firstName, lastName, email, username, phone, photoUrl })
      .then((ok) => {
        if (ok) {
          Alert.alert(t('profile.updateTitle'), t('profile.updateOk'));
          setShowEditForm(false);
        }
      })
      .finally(() => setSaving(false));
  };

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
            <Text style={styles.settingsIconText}>⚙️</Text>
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

        {/* ─── Quick Stats ─── */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{ptRemaining ?? '—'}</Text>
            <Text style={styles.statLabel}>Kalan PT</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{spaRemaining ?? '—'}</Text>
            <Text style={styles.statLabel}>Kalan Masaj</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>Aktif</Text>
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
        </GlassCard>

        {/* ─── Edit Form (collapsible) ─── */}
        {showEditForm && (
          <GlassCard style={styles.editCard}>
            <View style={styles.editHeader}>
              <Text style={styles.cardTitle}>{t('profile.editTitle')}</Text>
              <Pressable onPress={() => setShowEditForm(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.cardLineMuted}>{t('profile.editBody')}</Text>

            <Pressable
              style={({ pressed }) => [styles.photoBtn, pressed && styles.photoBtnPressed]}
              onPress={uploadPhoto}
              disabled={uploadingPhoto}
            >
              <Text style={styles.photoBtnTxt}>
                {uploadingPhoto
                  ? t('profile.photoUploading')
                  : photoUrl
                    ? t('profile.photoChange')
                    : t('profile.photoUpload')}
              </Text>
            </Pressable>

            <PremiumInput
              label={t('register.firstName')}
              value={firstName}
              onChangeText={setFirstName}
            />
            <PremiumInput
              label={t('register.lastName')}
              value={lastName}
              onChangeText={setLastName}
            />
            <PremiumInput label={t('login.emailLabel')} value={email} onChangeText={setEmail} />
            <PremiumInput
              label={t('register.usernameLabel')}
              value={username}
              onChangeText={setUsername}
            />
            <PremiumInput label={t('register.phoneLabel')} value={phone} onChangeText={setPhone} />

            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.btnPrimaryPressed,
                saving && styles.btnDisabled,
              ]}
              disabled={saving}
              onPress={handleSave}
            >
              <Text style={styles.btnPrimaryTxt}>
                {saving ? t('profile.saving') : t('profile.save')}
              </Text>
            </Pressable>
          </GlassCard>
        )}

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
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: premium.textMuted,
  },

  /* ─── Quick Access ─── */
  quickAccessCard: {
    marginBottom: 12,
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

  /* ─── Edit Form ─── */
  editCard: {
    marginBottom: 12,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  closeBtn: {
    fontSize: 18,
    color: premium.textMuted,
    padding: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
  },
  cardLineMuted: {
    fontSize: 13,
    color: premium.textMuted,
    marginBottom: 10,
  },
  photoBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  photoBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  photoBtnTxt: {
    color: premium.accentBlue,
    fontWeight: '700',
    fontSize: 14,
  },

  /* ─── Settings ─── */
  settingsCard: {
    marginBottom: 12,
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
  btnPrimary: {
    backgroundColor: 'rgba(56,189,248,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.5)',
    borderRadius: premium.radiusSm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  btnPrimaryPressed: {
    backgroundColor: 'rgba(56,189,248,0.5)',
  },
  btnPrimaryTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnDanger: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.6)',
    backgroundColor: 'rgba(248,113,113,0.2)',
    marginTop: 8,
  },
  btnDangerPressed: {
    backgroundColor: 'rgba(248,113,113,0.3)',
  },
  btnDangerTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  btnGhost: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: premium.radiusSm,
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
    fontSize: 15,
  },
});
