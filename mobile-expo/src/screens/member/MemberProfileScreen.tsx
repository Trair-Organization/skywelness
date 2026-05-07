import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { getApiBaseUrl } from '../../config';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { PremiumInput } from '../../components/premium/PremiumInput';
import { persistLanguage } from '../../i18n';
import { premium } from '../../theme/premiumTheme';

const TAB_BAR_PAD = 72;

export function MemberProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, tenant, logout, deleteAccount, updateProfile } = useMemberAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const openPolicies = () => {
    Alert.alert(t('home.policiesCta'), t('home.policiesBody'));
  };

  const openPrivacy = () => {
    Alert.alert(t('profile.privacyTitle'), t('profile.privacyBody'));
  };

  const openTerms = () => {
    Alert.alert(t('profile.termsTitle'), t('profile.termsBody'));
  };

  const uploadPhoto = async () => {
    const pick = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: false,
    });
    const asset = pick.assets?.[0];
    if (!asset?.uri) {
      return;
    }
    setUploadingPhoto(true);
    try {
      const apiRoot = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
      const form = new FormData();
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? `profile-${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
      } as never);
      const res = await fetch(`${apiRoot}/api/v1/auth/upload-image`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        throw new Error('upload_failed');
      }
      const body = (await res.json()) as { url?: string };
      if (!body.url) {
        throw new Error('upload_failed');
      }
      const absolute = body.url.startsWith('http') ? body.url : `${apiRoot}${body.url}`;
      setPhotoUrl(absolute);
    } catch {
      Alert.alert(t('profile.updateTitle'), t('profile.photoUploadFailed'));
    } finally {
      setUploadingPhoto(false);
    }
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
        <Text style={styles.screenTitle}>{t('tabs.profile')}</Text>
        <Text style={styles.screenSub}>{t('profile.subtitle')}</Text>

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.editTitle')}</Text>
          <Text style={styles.cardLineMuted}>{t('profile.editBody')}</Text>
          <Pressable
            style={({ pressed }) => [styles.photoBtn, pressed && styles.photoBtnPressed]}
            onPress={() => {
              uploadPhoto().catch(() => {});
            }}
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
          {photoUrl ? <Text style={styles.photoLine}>{photoUrl}</Text> : null}
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
          <Text style={styles.cardLine}>{t('session.role', { role: user.role })}</Text>
          <Text style={styles.cardLineMuted}>
            {tenant.name} · {tenant.subdomain}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.btnPrimaryPressed,
              saving && styles.btnDisabled,
            ]}
            disabled={saving}
            onPress={() => {
              if (!firstName.trim() || !lastName.trim() || !email.trim() || !username.trim()) {
                Alert.alert(t('profile.updateTitle'), t('profile.updateValidation'));
                return;
              }
              setSaving(true);
              updateProfile({ firstName, lastName, email, username, phone, photoUrl })
                .then((ok) => {
                  if (ok) {
                    Alert.alert(t('profile.updateTitle'), t('profile.updateOk'));
                  }
                })
                .finally(() => setSaving(false));
            }}
          >
            <Text style={styles.btnPrimaryTxt}>
              {saving ? t('profile.saving') : t('profile.save')}
            </Text>
          </Pressable>
        </GlassCard>

        <GlassCard style={styles.card}>
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
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.contractsTitle')}</Text>
          <Text style={styles.muted}>{t('profile.contractsBody')}</Text>
          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
            onPress={openPrivacy}
          >
            <Text style={styles.btnOutlineTxt}>{t('profile.privacyTitle')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
            onPress={openTerms}
          >
            <Text style={styles.btnOutlineTxt}>{t('profile.termsTitle')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
            onPress={openPolicies}
          >
            <Text style={styles.btnOutlineTxt}>{t('home.policiesCta')}</Text>
          </Pressable>
        </GlassCard>

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
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 14,
    color: premium.textMuted,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
  },
  cardLine: {
    fontSize: 15,
    color: premium.text,
    marginBottom: 4,
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
  photoLine: {
    color: premium.textMuted,
    fontSize: 11,
    marginBottom: 10,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    color: premium.textMuted,
    marginBottom: 12,
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
  btnOutline: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  btnOutlinePressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnOutlineTxt: {
    color: premium.accentBlue,
    fontWeight: '700',
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
});
