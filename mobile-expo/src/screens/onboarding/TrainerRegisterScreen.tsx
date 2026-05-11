import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { showImagePickerAlert } from '../../utils/imagePicker';
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

// ─── Uzmanlık Alanları (Multi-Select) ─────────────────────────────────────────
const SPECIALTY_OPTIONS = [
  { id: 'fitness', label: 'Fitness', icon: '🏋️' },
  { id: 'pilates', label: 'Pilates', icon: '🧘' },
  { id: 'yoga', label: 'Yoga', icon: '🧘‍♀️' },
  { id: 'crossfit', label: 'CrossFit', icon: '💪' },
  { id: 'boxing', label: 'Boks', icon: '🥊' },
  { id: 'swimming', label: 'Yüzme', icon: '🏊' },
  { id: 'dance', label: 'Dans', icon: '💃' },
  { id: 'nutrition', label: 'Beslenme', icon: '🥗' },
  { id: 'rehabilitation', label: 'Rehabilitasyon', icon: '🏥' },
  { id: 'functional', label: 'Fonksiyonel', icon: '⚡' },
  { id: 'strength', label: 'Güç Antrenmanı', icon: '🏆' },
  { id: 'cardio', label: 'Kardiyo', icon: '❤️' },
  { id: 'massage', label: 'Masaj/Spa', icon: '💆' },
  { id: 'martial_arts', label: 'Dövüş Sanatları', icon: '🥋' },
  { id: 'outdoor', label: 'Outdoor', icon: '🌲' },
];

// ─── Sertifika Seçenekleri ────────────────────────────────────────────────────
const CERTIFICATION_OPTIONS = [
  'ACE',
  'NASM',
  'ISSA',
  'NSCA',
  'ACSM',
  'EREPS',
  'TÜFİAD',
  'Pilates Mat',
  'Pilates Reformer',
  'Yoga Alliance RYT-200',
  'CrossFit L1',
  'CrossFit L2',
  'Kickbox',
  'Muay Thai',
  'Beslenme Danışmanlığı',
  'Sporcu Sağlığı',
  'Diğer',
];

// ─── Hizmet Tipleri ───────────────────────────────────────────────────────────
const SESSION_TYPE_OPTIONS = [
  { id: 'personal_training', label: 'Özel Ders (PT)', icon: '🏋️' },
  { id: 'group_class', label: 'Grup Dersi', icon: '👥' },
  { id: 'online', label: 'Online Ders', icon: '💻' },
];

export function TrainerRegisterScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  // Step management
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Kişisel Bilgiler
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Step 2: Profesyonel Bilgiler
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [selectedSessionTypes, setSelectedSessionTypes] = useState<string[]>(['personal_training']);
  const [experienceYears, setExperienceYears] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');

  // Step 3: Ek Bilgiler
  const [pricingNote, setPricingNote] = useState('');
  const [socialLinks, setSocialLinks] = useState('');
  const [connectClub, setConnectClub] = useState(false);
  const [selectedClubSubdomain, setSelectedClubSubdomain] = useState('');
  const [clubs, setClubs] = useState<Array<{ id: string; name: string; subdomain: string }>>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [showClubList, setShowClubList] = useState(false);

  const [loading, setLoading] = useState(false);

  const toggleSpecialty = (id: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const toggleCertification = (cert: string) => {
    setSelectedCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert],
    );
  };

  const toggleSessionType = (id: string) => {
    setSelectedSessionTypes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const loadClubs = async () => {
    setClubsLoading(true);
    try {
      const rows = await apiJson<Array<{ id: string; name: string; subdomain: string }>>(
        '/tenants',
        { auth: false },
      );
      setClubs(rows);
    } finally {
      setClubsLoading(false);
    }
  };

  const uploadPhoto = () => {
    setUploadingPhoto(true);
    showImagePickerAlert(
      (url) => {
        setPhotoUrl(url);
        setUploadingPhoto(false);
      },
      () => {
        setUploadingPhoto(false);
      },
    );
  };

  const validateStep1 = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Hata', 'Ad ve soyad zorunludur');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Hata', 'Geçerli bir e-posta girin');
      return false;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('Hata', 'Geçerli bir telefon numarası girin');
      return false;
    }
    if (!username.trim() || username.trim().length < 3) {
      Alert.alert('Hata', 'Kullanıcı adı en az 3 karakter olmalı');
      return false;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,}$/.test(password)) {
      Alert.alert('Hata', 'Şifre: en az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (selectedSpecialties.length === 0) {
      Alert.alert('Hata', 'En az bir uzmanlık alanı seçin');
      return false;
    }
    if (!city.trim()) {
      Alert.alert('Hata', 'Şehir zorunludur');
      return false;
    }
    if (!bio.trim() || bio.trim().length < 20) {
      Alert.alert('Hata', 'Biyografi en az 20 karakter olmalı');
      return false;
    }
    if (selectedSessionTypes.length === 0) {
      Alert.alert('Hata', 'En az bir hizmet tipi seçin');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    setLoading(true);
    try {
      const specialtyLabels = selectedSpecialties.map(
        (id) => SPECIALTY_OPTIONS.find((o) => o.id === id)?.label ?? id,
      );
      const res = await apiJson<{ tenantSubdomain: string; pendingApproval: boolean }>(
        '/auth/register-trainer',
        {
          method: 'POST',
          auth: false,
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            city: city.trim(),
            username: username.trim().toLocaleLowerCase('tr-TR'),
            password,
            bio: bio.trim(),
            specialties: specialtyLabels,
            certifications: selectedCertifications,
            experienceYears: experienceYears ? parseInt(experienceYears, 10) : undefined,
            socialLinks: socialLinks
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
            pricingNote: pricingNote.trim() || undefined,
            photoUrl: photoUrl.trim() || undefined,
            offersSessionTypes: selectedSessionTypes,
            preferredClubSubdomain: connectClub ? selectedClubSubdomain || undefined : undefined,
          }),
        },
      );
      Alert.alert(
        '✅ Başvurunuz Alındı',
        'Eğitmen başvurunuz incelemeye alınmıştır. Onaylandığında bilgilendirileceksiniz.',
        [{ text: 'Tamam', onPress: () => navigation.navigate('ClubConnect') }],
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Kayıt başarısız');
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Pressable
          style={styles.backBtn}
          onPress={() => (step > 1 ? prevStep() : navigation.goBack())}
        >
          <Text style={styles.backTxt}>← {step > 1 ? 'Geri' : 'Vazgeç'}</Text>
        </Pressable>

        <Text style={styles.title}>🏋️ Eğitmen Kayıt</Text>
        <Text style={styles.subtitle}>Profesyonel profilinizi oluşturun</Text>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View key={i} style={[styles.progressDot, i < step && styles.progressDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>
          Adım {step}/{totalSteps}
        </Text>

        {/* ═══ STEP 1: Kişisel Bilgiler ═══ */}
        {step === 1 && (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>👤 Kişisel Bilgiler</Text>

            {/* Avatar */}
            <View style={styles.avatarSection}>
              <Pressable style={styles.avatarRing} onPress={uploadPhoto} disabled={uploadingPhoto}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarIcon}>📷</Text>
                    <Text style={styles.avatarHint}>Fotoğraf</Text>
                  </View>
                )}
              </Pressable>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <PremiumInput label="Ad *" value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={styles.half}>
                <PremiumInput label="Soyad *" value={lastName} onChangeText={setLastName} />
              </View>
            </View>
            <PremiumInput
              label="E-posta *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <PremiumInput
              label="Telefon *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="05XX XXX XX XX"
            />
            <PremiumInput
              label="Kullanıcı Adı *"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="egitmen.adi"
            />
            <PremiumInput
              label="Şifre *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="En az 8 karakter"
            />
            <Text style={styles.hint}>
              Şifre: 1 büyük harf, 1 küçük harf, 1 rakam, min 8 karakter
            </Text>
          </GlassCard>
        )}

        {/* ═══ STEP 2: Profesyonel Bilgiler ═══ */}
        {step === 2 && (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>💼 Profesyonel Bilgiler</Text>

            {/* Uzmanlık Alanları (Multi-Select Grid) */}
            <Text style={styles.fieldLabel}>Uzmanlık Alanları * (birden fazla seçebilirsiniz)</Text>
            <View style={styles.chipGrid}>
              {SPECIALTY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, selectedSpecialties.includes(opt.id) && styles.chipActive]}
                  onPress={() => toggleSpecialty(opt.id)}
                >
                  <Text style={styles.chipIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.chipText,
                      selectedSpecialties.includes(opt.id) && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Hizmet Tipleri */}
            <Text style={styles.fieldLabel}>Sunduğunuz Hizmetler *</Text>
            <View style={styles.chipGrid}>
              {SESSION_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, selectedSessionTypes.includes(opt.id) && styles.chipActive]}
                  onPress={() => toggleSessionType(opt.id)}
                >
                  <Text style={styles.chipIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.chipText,
                      selectedSessionTypes.includes(opt.id) && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Sertifikalar (Multi-Select) */}
            <Text style={styles.fieldLabel}>Sertifikalar (opsiyonel)</Text>
            <View style={styles.chipGrid}>
              {CERTIFICATION_OPTIONS.map((cert) => (
                <Pressable
                  key={cert}
                  style={[
                    styles.chipSmall,
                    selectedCertifications.includes(cert) && styles.chipSmallActive,
                  ]}
                  onPress={() => toggleCertification(cert)}
                >
                  <Text
                    style={[
                      styles.chipSmallText,
                      selectedCertifications.includes(cert) && styles.chipSmallTextActive,
                    ]}
                  >
                    {cert}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <PremiumInput
                  label="Şehir *"
                  value={city}
                  onChangeText={setCity}
                  placeholder="İstanbul"
                />
              </View>
              <View style={styles.half}>
                <PremiumInput
                  label="Deneyim (yıl)"
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  keyboardType="number-pad"
                  placeholder="5"
                />
              </View>
            </View>

            <PremiumInput
              label="Biyografi * (min 20 karakter)"
              value={bio}
              onChangeText={setBio}
              multiline
              placeholder="Kendinizi tanıtın, eğitim felsefenizi anlatın..."
            />
          </GlassCard>
        )}

        {/* ═══ STEP 3: Ek Bilgiler & Gönder ═══ */}
        {step === 3 && (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Son Adım</Text>

            <PremiumInput
              label="Fiyatlandırma Notu"
              value={pricingNote}
              onChangeText={setPricingNote}
              placeholder="Seans başı 500₺, 10'lu paket 4000₺..."
              multiline
            />

            {/* Kulüp Bağlantısı */}
            <Pressable
              style={[styles.clubToggle, connectClub && styles.clubToggleActive]}
              onPress={() => {
                const next = !connectClub;
                setConnectClub(next);
                if (next && clubs.length === 0) loadClubs().catch(() => {});
              }}
            >
              <View>
                <Text style={styles.clubToggleText}>🏢 Bir kulübe bağlan</Text>
                <Text style={styles.clubToggleHint}>
                  Bir kulübün eğitmeni olarak çalışmak istiyorsanız
                </Text>
              </View>
              <Text style={styles.clubToggleMark}>{connectClub ? '✓' : '+'}</Text>
            </Pressable>

            {connectClub && (
              <View style={styles.clubSection}>
                {clubsLoading ? (
                  <ActivityIndicator color={premium.accentBlue} />
                ) : (
                  <>
                    <Pressable
                      style={styles.clubSelectBtn}
                      onPress={() => setShowClubList(!showClubList)}
                    >
                      <Text style={styles.clubSelectText}>
                        {selectedClubSubdomain || 'Kulüp seçin...'}
                      </Text>
                      <Text style={styles.clubSelectArrow}>{showClubList ? '▲' : '▼'}</Text>
                    </Pressable>
                    {showClubList &&
                      clubs.map((c) => (
                        <Pressable
                          key={c.id}
                          style={styles.clubOption}
                          onPress={() => {
                            setSelectedClubSubdomain(c.subdomain);
                            setShowClubList(false);
                          }}
                        >
                          <Text style={styles.clubOptionName}>{c.name}</Text>
                        </Pressable>
                      ))}
                  </>
                )}
              </View>
            )}

            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Özet</Text>
              <Text style={styles.summaryItem}>
                👤 {firstName} {lastName}
              </Text>
              <Text style={styles.summaryItem}>📧 {email}</Text>
              <Text style={styles.summaryItem}>📍 {city}</Text>
              <Text style={styles.summaryItem}>
                🏋️{' '}
                {selectedSpecialties
                  .map((id) => SPECIALTY_OPTIONS.find((o) => o.id === id)?.label)
                  .join(', ')}
              </Text>
              {selectedCertifications.length > 0 && (
                <Text style={styles.summaryItem}>📜 {selectedCertifications.join(', ')}</Text>
              )}
            </View>
          </GlassCard>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navRow}>
          {step > 1 && (
            <Pressable style={styles.prevBtn} onPress={prevStep}>
              <Text style={styles.prevBtnText}>← Geri</Text>
            </Pressable>
          )}
          {step < totalSteps ? (
            <Pressable style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextBtnText}>Devam →</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.submitBtn, loading && { opacity: 0.5 }]}
              onPress={submit}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>
                {loading ? '⏳ Gönderiliyor...' : '✓ Başvuruyu Gönder'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  root: { paddingHorizontal: 20, maxWidth: 480, width: '100%', alignSelf: 'center' },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 8 },
  backTxt: { color: premium.accentBlue, fontSize: 14, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '900', color: premium.text },
  subtitle: { fontSize: 14, color: premium.textMuted, marginTop: 4, marginBottom: 12 },

  // Progress
  progressBar: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(148,163,184,0.15)' },
  progressDotActive: { backgroundColor: premium.accentBlue },
  stepLabel: { fontSize: 12, color: premium.textMuted, marginBottom: 16 },

  // Card
  card: { marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: premium.text, marginBottom: 16 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 16 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.05)',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center' },
  avatarIcon: { fontSize: 24 },
  avatarHint: { fontSize: 10, color: premium.textMuted, marginTop: 2 },

  // Layout
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  hint: { fontSize: 11, color: premium.textMuted, marginTop: -4, marginBottom: 8 },

  // Field Label
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: premium.text,
    marginBottom: 10,
    marginTop: 8,
  },

  // Chip Grid (Multi-Select)
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    backgroundColor: 'rgba(148,163,184,0.04)',
  },
  chipActive: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.1)',
  },
  chipIcon: { fontSize: 16 },
  chipText: { fontSize: 13, fontWeight: '600', color: premium.textMuted },
  chipTextActive: { color: premium.accentBlue },

  // Small Chips (Certifications)
  chipSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    backgroundColor: 'rgba(148,163,184,0.04)',
  },
  chipSmallActive: {
    borderColor: premium.accentGreen,
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  chipSmallText: { fontSize: 12, fontWeight: '600', color: premium.textMuted },
  chipSmallTextActive: { color: premium.accentGreen },

  // Club
  clubToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    backgroundColor: 'rgba(148,163,184,0.04)',
    marginTop: 12,
  },
  clubToggleActive: {
    borderColor: 'rgba(56,189,248,0.3)',
    backgroundColor: 'rgba(56,189,248,0.05)',
  },
  clubToggleText: { fontSize: 14, fontWeight: '700', color: premium.text },
  clubToggleHint: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  clubToggleMark: { fontSize: 18, fontWeight: '800', color: premium.accentBlue },
  clubSection: { marginTop: 10 },
  clubSelectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    backgroundColor: 'rgba(148,163,184,0.06)',
  },
  clubSelectText: { fontSize: 14, fontWeight: '600', color: premium.text },
  clubSelectArrow: { fontSize: 12, color: premium.textMuted },
  clubOption: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(148,163,184,0.1)' },
  clubOptionName: { fontSize: 14, fontWeight: '600', color: premium.text },

  // Summary
  summary: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(56,189,248,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.15)',
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: premium.accentBlue, marginBottom: 8 },
  summaryItem: { fontSize: 13, color: premium.text, marginBottom: 4 },

  // Navigation
  navRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  prevBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  prevBtnText: { fontSize: 15, fontWeight: '700', color: premium.textMuted },
  nextBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: premium.accentBlue,
  },
  nextBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  submitBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: premium.accentGreen,
  },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
