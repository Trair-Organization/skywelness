import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
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

type Nav = NativeStackNavigationProp<RootStackParamList, 'TrainerRegister'>;

export function TrainerRegisterScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [certifications, setCertifications] = useState('');
  const [loading, setLoading] = useState(false);

  const splitName = (name: string) => {
    const trimmed = name.trim();
    const firstSpace = trimmed.indexOf(' ');
    if (firstSpace === -1) {
      return { firstName: trimmed, lastName: trimmed };
    }
    return {
      firstName: trimmed.slice(0, firstSpace).trim(),
      lastName: trimmed.slice(firstSpace + 1).trim() || trimmed.slice(0, firstSpace).trim(),
    };
  };

  const submit = async () => {
    const { firstName, lastName } = splitName(fullName);
    if (!firstName || !email.trim() || !phone.trim() || !city.trim() || !bio.trim()) {
      Alert.alert(t('register.section'), t('trainerRegister.requiredError'));
      return;
    }
    setLoading(true);
    try {
      const res = await apiJson<{ tenantSubdomain: string; pendingApproval: boolean }>(
        '/auth/register-trainer',
        {
          method: 'POST',
          auth: false,
          body: JSON.stringify({
            firstName,
            lastName,
            email: email.trim(),
            phone: phone.trim(),
            city: city.trim(),
            username: username.trim().toLocaleLowerCase('tr-TR'),
            password,
            bio: bio.trim(),
            specialties: specialties
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
            certifications: certifications
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
            offersSessionTypes: ['personal_training'],
          }),
        },
      );
      Alert.alert(
        t('trainerRegister.successTitle'),
        t('trainerRegister.successBody', { subdomain: res.tenantSubdomain }),
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.navigate('ClubConnect'),
          },
        ],
      );
    } catch (e) {
      Alert.alert(
        t('register.section'),
        e instanceof ApiError ? e.message : t('trainerRegister.submitFailed'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.root,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('trainerRegister.title')}</Text>
        <Text style={styles.subTitle}>{t('trainerRegister.subtitle')}</Text>
        <GlassCard style={styles.card}>
          <PremiumInput
            label={t('onboarding.fullName')}
            value={fullName}
            onChangeText={setFullName}
          />
          <PremiumInput label={t('login.emailLabel')} value={email} onChangeText={setEmail} />
          <PremiumInput label={t('register.phoneLabel')} value={phone} onChangeText={setPhone} />
          <PremiumInput label={t('trainerRegister.city')} value={city} onChangeText={setCity} />
          <PremiumInput
            label={t('register.usernameLabel')}
            value={username}
            onChangeText={setUsername}
          />
          <PremiumInput
            label={t('login.passwordLabel')}
            value={password}
            secureTextEntry
            onChangeText={setPassword}
          />
          <PremiumInput
            label={t('trainerRegister.bio')}
            value={bio}
            onChangeText={setBio}
            multiline
          />
          <PremiumInput
            label={t('trainerRegister.specialties')}
            value={specialties}
            onChangeText={setSpecialties}
            placeholder={t('trainerRegister.commaHint')}
          />
          <PremiumInput
            label={t('trainerRegister.certifications')}
            value={certifications}
            onChangeText={setCertifications}
            placeholder={t('trainerRegister.commaHint')}
          />
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              loading && styles.submitBtnDisabled,
            ]}
            onPress={() => {
              submit().catch(() => {});
            }}
            disabled={loading}
          >
            <Text style={styles.submitTxt}>
              {loading ? t('trainerRegister.submitting') : t('trainerRegister.submit')}
            </Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  root: { paddingHorizontal: 22, maxWidth: 440, width: '100%', alignSelf: 'center' },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 2, marginBottom: 6 },
  backTxt: { color: premium.textMuted, fontSize: 14, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: premium.text },
  subTitle: { marginTop: 6, marginBottom: 12, color: premium.textMuted, fontSize: 14 },
  card: { marginTop: 8 },
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
  submitBtnPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  submitBtnDisabled: { opacity: 0.6 },
  submitTxt: { color: premium.accentBlue, fontSize: 18, fontWeight: '700' },
});
