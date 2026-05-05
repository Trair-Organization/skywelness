import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { PremiumInput } from '../../components/premium/PremiumInput';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CorporateEntry'>;

export function CorporateEntryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [clubCount, setClubCount] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');

  const submit = () => {
    if (
      !companyName.trim() ||
      !contactName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !city.trim()
    ) {
      Alert.alert(t('register.section'), t('registration.partnerRequiredError'));
      return;
    }
    Alert.alert(t('registration.partnerSuccessTitle'), t('registration.partnerSuccessBody'), [
      {
        text: t('common.ok'),
        onPress: () => navigation.navigate('ClubConnect'),
      },
    ]);
  };

  return (
    <GradientBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.root,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backBtn} onPress={() => navigation.navigate('RegistrationType')}>
          <Text style={styles.backTxt}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('registration.partnerFormTitle')}</Text>
        <Text style={styles.sub}>{t('registration.partnerFormSubtitle')}</Text>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t('registration.partnerCompanySection')}</Text>
          <PremiumInput
            label={t('registration.partnerCompanyName')}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder={t('registration.partnerCompanyNamePh')}
          />
          <PremiumInput
            label={t('registration.partnerClubCount')}
            value={clubCount}
            onChangeText={setClubCount}
            keyboardType="number-pad"
            placeholder={t('registration.partnerClubCountPh')}
          />
          <PremiumInput
            label={t('registration.partnerWebsite')}
            value={website}
            onChangeText={setWebsite}
            placeholder={t('registration.partnerWebsitePh')}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.sectionTitle}>{t('registration.partnerContactSection')}</Text>
          <PremiumInput
            label={t('registration.partnerContactName')}
            value={contactName}
            onChangeText={setContactName}
            placeholder={t('registration.partnerContactNamePh')}
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
            placeholder={t('register.phonePh')}
          />
          <PremiumInput
            label={t('trainerRegister.city')}
            value={city}
            onChangeText={setCity}
            placeholder={t('trainerRegister.city')}
          />
          <PremiumInput
            label={t('registration.partnerNotes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder={t('registration.partnerNotesPh')}
          />

          <Pressable style={styles.submitBtn} onPress={submit}>
            <Text style={styles.submitTxt}>{t('registration.partnerSubmit')}</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  root: {
    paddingHorizontal: 22,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  backTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  sub: {
    color: premium.textMuted,
    fontSize: 15,
    marginBottom: 16,
  },
  card: {
    marginTop: 6,
  },
  sectionTitle: {
    color: premium.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
  submitTxt: {
    color: premium.accentBlue,
    fontSize: 17,
    fontWeight: '700',
  },
});
