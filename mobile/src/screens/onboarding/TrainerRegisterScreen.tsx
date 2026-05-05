import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const [experienceYears, setExperienceYears] = useState('');
  const [socialLinks, setSocialLinks] = useState('');
  const [pricingNote, setPricingNote] = useState('');
  const [connectClub, setConnectClub] = useState(false);
  const [clubQuery, setClubQuery] = useState('');
  const [clubListOpen, setClubListOpen] = useState(false);
  const [selectedClubSubdomain, setSelectedClubSubdomain] = useState('');
  const [clubsLoading, setClubsLoading] = useState(false);
  const [clubs, setClubs] = useState<Array<{ id: string; name: string; subdomain: string }>>([]);
  const [loading, setLoading] = useState(false);

  const filteredClubs = useMemo(() => {
    const q = clubQuery.trim().toLowerCase();
    if (!q) {
      return clubs;
    }
    return clubs.filter(
      (c) => c.name.toLowerCase().includes(q) || c.subdomain.toLowerCase().includes(q),
    );
  }, [clubQuery, clubs]);

  const loadClubs = async () => {
    setClubsLoading(true);
    try {
      const rows = await apiJson<Array<{ id: string; name: string; subdomain: string }>>(
        '/tenants',
        {
          auth: false,
        },
      );
      setClubs(rows);
    } finally {
      setClubsLoading(false);
    }
  };

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
    if (
      !firstName ||
      !email.trim() ||
      !phone.trim() ||
      !city.trim() ||
      !bio.trim() ||
      specialties
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean).length === 0
    ) {
      Alert.alert(t('register.section'), t('trainerRegister.requiredError'));
      return;
    }
    if (!username.trim()) {
      Alert.alert(t('register.section'), t('register.usernameRequired'));
      return;
    }
    if (!/^[a-z0-9çğıöşü_.-]{3,}$/.test(username.trim().toLocaleLowerCase('tr-TR'))) {
      Alert.alert(t('register.section'), t('register.usernameInvalid'));
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,}$/.test(password)) {
      Alert.alert(t('register.section'), t('register.passwordRules'));
      return;
    }
    if (bio.trim().length < 20) {
      Alert.alert(t('register.section'), t('trainerRegister.bioMinLength'));
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
            experienceYears:
              experienceYears.trim().length > 0
                ? Number.parseInt(experienceYears.trim(), 10) || 0
                : undefined,
            socialLinks: socialLinks
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
            pricingNote: pricingNote.trim() || undefined,
            offersSessionTypes: ['personal_training'],
            preferredClubSubdomain: connectClub ? selectedClubSubdomain || undefined : undefined,
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
          <Text style={styles.sectionTitle}>{t('trainerRegister.identitySection')}</Text>
          <PremiumInput
            label={t('onboarding.fullName')}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('onboarding.fullNamePh')}
          />
          <PremiumInput
            label={t('login.emailLabel')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <PremiumInput
            label={t('register.phoneLabel')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <PremiumInput label={t('trainerRegister.city')} value={city} onChangeText={setCity} />

          <Text style={styles.sectionTitle}>{t('trainerRegister.accountSection')}</Text>
          <PremiumInput
            label={t('register.usernameLabel')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <PremiumInput
            label={t('login.passwordLabel')}
            value={password}
            secureTextEntry
            onChangeText={setPassword}
          />

          <Text style={styles.sectionTitle}>{t('trainerRegister.profileSection')}</Text>
          <PremiumInput
            label={t('trainerRegister.bio')}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder={t('trainerRegister.bioHint')}
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
          <PremiumInput
            label={t('trainerRegister.experienceYears')}
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="number-pad"
            placeholder="0"
          />
          <PremiumInput
            label={t('trainerRegister.socialLinks')}
            value={socialLinks}
            onChangeText={setSocialLinks}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('trainerRegister.commaHint')}
          />
          <PremiumInput
            label={t('trainerRegister.pricingNote')}
            value={pricingNote}
            onChangeText={setPricingNote}
            placeholder={t('trainerRegister.pricingNoteHint')}
          />
          <Pressable
            style={styles.optionalClubToggle}
            onPress={() => {
              const next = !connectClub;
              setConnectClub(next);
              if (next && clubs.length === 0) {
                loadClubs().catch(() => {});
              }
            }}
          >
            <Text style={styles.optionalClubToggleTxt}>
              {t('trainerRegister.optionalClubToggle')}
            </Text>
            <Text style={styles.optionalClubToggleMark}>{connectClub ? '✓' : '+'}</Text>
          </Pressable>
          {connectClub ? (
            <View style={styles.clubWrap}>
              <Text style={styles.clubHint}>{t('trainerRegister.optionalClubHint')}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.clubSelectBtn,
                  pressed && styles.clubSelectBtnPressed,
                ]}
                onPress={() => {
                  const next = !clubListOpen;
                  setClubListOpen(next);
                  if (next && clubs.length === 0) {
                    loadClubs().catch(() => {});
                  }
                }}
              >
                {clubsLoading ? (
                  <ActivityIndicator color={premium.accentBlue} />
                ) : (
                  <Text style={styles.clubSelectTxt}>
                    {selectedClubSubdomain || t('trainerRegister.optionalClubPlaceholder')}
                  </Text>
                )}
              </Pressable>
              {clubListOpen ? (
                <View style={styles.clubList}>
                  <PremiumInput
                    label={t('tenant.searchLabel')}
                    value={clubQuery}
                    onChangeText={setClubQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={t('tenant.searchPlaceholder')}
                  />
                  {filteredClubs.map((club) => (
                    <Pressable
                      key={club.id}
                      style={styles.clubRow}
                      onPress={() => {
                        setSelectedClubSubdomain(club.subdomain);
                        setClubListOpen(false);
                        setClubQuery('');
                      }}
                    >
                      <Text style={styles.clubRowName}>{club.name}</Text>
                      <Text style={styles.clubRowCode}>{club.subdomain}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
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
  sectionTitle: {
    color: premium.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  optionalClubToggle: {
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  optionalClubToggleTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  optionalClubToggleMark: {
    color: premium.accentBlue,
    fontSize: 18,
    fontWeight: '800',
  },
  clubWrap: {
    marginBottom: 10,
  },
  clubHint: {
    color: premium.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  clubSelectBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
  },
  clubSelectBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  clubSelectTxt: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  clubList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    padding: 8,
    maxHeight: 260,
    backgroundColor: 'rgba(4,13,24,0.98)',
  },
  clubRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  clubRowName: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '600',
  },
  clubRowCode: {
    color: premium.textMuted,
    fontSize: 12,
    marginTop: 2,
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
  submitBtnPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  submitBtnDisabled: { opacity: 0.6 },
  submitTxt: { color: premium.accentBlue, fontSize: 18, fontWeight: '700' },
});
