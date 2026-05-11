import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { showImagePickerAlert } from '../../utils/imagePicker';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { persistLanguage } from '../../i18n';
import { premium } from '../../theme/premiumTheme';
import type { TrainerTabParamList } from '../../navigation/trainerTabTypes';

// ─── Uzmanlık Seçenekleri ─────────────────────────────────────────────────────
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

const SESSION_TYPE_OPTIONS = [
  { id: 'personal_training', label: 'Özel Ders (PT)', icon: '🏋️' },
  { id: 'group_class', label: 'Grup Dersi', icon: '👥' },
  { id: 'online', label: 'Online Ders', icon: '💻' },
];

type ProfileData = {
  trainerId: string;
  bio: string;
  specialties: string[];
  certifications: string[];
  experienceYears: number | null;
  city: string;
  photoUrl: string | null;
  pricingNote: string | null;
  role: string;
};

export function TrainerProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, token, tenant, logout } = useMemberAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TrainerTabParamList>>();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Club connection (bağımsız eğitmenler için)
  const [clubCode, setClubCode] = useState('');
  const [joiningClub, setJoiningClub] = useState(false);

  // Editable fields
  const [bio, setBio] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState('');
  const [selectedSessionTypes, setSelectedSessionTypes] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [pricingNote, setPricingNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Animation
  const editAnim = useRef(new Animated.Value(0)).current;

  const opts = { token: token ?? undefined, tenantSubdomain: tenant?.subdomain };

  const load = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const res = await apiJson<ProfileData>('/trainer-panel/profile', opts);
      setProfile(res);
      setBio(res.bio ?? '');
      setCity(res.city ?? '');
      setExperienceYears(res.experienceYears?.toString() ?? '');
      setPricingNote(res.pricingNote ?? '');
      setPhotoUrl(res.photoUrl ?? null);
      setSelectedCertifications((res.certifications ?? []).join(', '));
      // Match specialties to options
      const specIds = (res.specialties ?? []).map((s) => {
        const found = SPECIALTY_OPTIONS.find((o) => o.label.toLowerCase() === s.toLowerCase());
        return found?.id ?? s;
      });
      setSelectedSpecialties(specIds);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [token, tenant]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  useEffect(() => {
    Animated.timing(editAnim, {
      toValue: showEditForm ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [showEditForm, editAnim]);

  const toggleSpecialty = (id: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const toggleSessionType = (id: string) => {
    setSelectedSessionTypes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
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

  const handleSave = async () => {
    if (!bio.trim() || !city.trim()) {
      Alert.alert('Hata', 'Biyografi ve şehir zorunludur');
      return;
    }
    if (selectedSpecialties.length === 0) {
      Alert.alert('Hata', 'En az bir uzmanlık alanı seçin');
      return;
    }
    setSaving(true);
    try {
      const specialtyLabels = selectedSpecialties.map(
        (id) => SPECIALTY_OPTIONS.find((o) => o.id === id)?.label ?? id,
      );
      await apiJson('/trainer-panel/profile', {
        ...opts,
        method: 'PATCH',
        body: JSON.stringify({
          bio: bio.trim(),
          specialties: specialtyLabels,
          certifications: selectedCertifications
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          city: city.trim(),
          experienceYears: experienceYears ? parseInt(experienceYears, 10) : null,
          pricingNote: pricingNote.trim() || null,
          photoUrl: photoUrl ?? undefined,
        }),
      });
      Alert.alert('✅', 'Profil güncellendi');
      setShowEditForm(false);
      void load();
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleJoinClub = async () => {
    if (!clubCode.trim() || !token || !tenant) return;
    setJoiningClub(true);
    try {
      const res = await apiJson<{ ok: boolean; clubName: string; message: string }>(
        '/trainer-panel/join-club',
        {
          ...opts,
          method: 'POST',
          body: JSON.stringify({ clubCode: clubCode.trim() }),
        },
      );
      Alert.alert('✅ Başvuru Gönderildi', res.message);
      setClubCode('');
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Başvuru gönderilemedi');
    } finally {
      setJoiningClub(false);
    }
  };

  const editMaxHeight = editAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1200] });
  const editOpacity = editAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] });

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
        </View>
      </GradientBackground>
    );
  }

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const initials =
    `${(user?.firstName ?? '')[0] ?? ''}${(user?.lastName ?? '')[0] ?? ''}`.toUpperCase();
  const roleLabel = profile?.role === 'independent_trainer' ? 'Bağımsız Eğitmen' : 'Kulüp Eğitmeni';

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Profile Header ─── */}
        <GlassCard style={styles.headerCard}>
          <Pressable style={styles.settingsIcon} onPress={() => setShowEditForm((v) => !v)}>
            <Text style={styles.settingsIconText}>{showEditForm ? '✕' : '⚙️'}</Text>
          </Pressable>

          <Pressable style={styles.avatarContainer} onPress={uploadPhoto} disabled={uploadingPhoto}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarCameraOverlay}>
              <Text style={styles.avatarCameraIcon}>📷</Text>
            </View>
          </Pressable>

          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>

          {/* Quick info chips */}
          {profile && (
            <View style={styles.infoChips}>
              {profile.city ? (
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>📍 {profile.city}</Text>
                </View>
              ) : null}
              {profile.experienceYears ? (
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>⏱ {profile.experienceYears} yıl</Text>
                </View>
              ) : null}
              {profile.specialties.length > 0 && (
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>
                    🏋️ {profile.specialties.slice(0, 2).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </GlassCard>

        {/* ─── Edit Form (animated) ─── */}
        <Animated.View
          style={[styles.editAnimWrap, { maxHeight: editMaxHeight, opacity: editOpacity }]}
        >
          <GlassCard style={styles.editCard}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitleIcon}>✏️</Text>
              <Text style={styles.editTitle}>Profil Düzenle</Text>
            </View>

            {/* Bio */}
            <Text style={styles.label}>Biyografi *</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={bio}
              onChangeText={setBio}
              placeholder="Kendinizi tanıtın..."
              placeholderTextColor={premium.textMuted}
              multiline
            />

            {/* Specialties Multi-Select */}
            <Text style={styles.label}>Uzmanlık Alanları *</Text>
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

            {/* Session Types */}
            <Text style={styles.label}>Sunduğunuz Hizmetler</Text>
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

            {/* Certifications */}
            <Text style={styles.label}>Sertifikalar</Text>
            <TextInput
              style={styles.input}
              value={selectedCertifications}
              onChangeText={setSelectedCertifications}
              placeholder="ACE, NASM (virgülle ayırın)"
              placeholderTextColor={premium.textMuted}
            />

            {/* City + Experience */}
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Şehir *</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="İstanbul"
                  placeholderTextColor={premium.textMuted}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Deneyim (yıl)</Text>
                <TextInput
                  style={styles.input}
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  placeholder="5"
                  placeholderTextColor={premium.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Pricing Note */}
            <Text style={styles.label}>Fiyatlandırma Notu</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={pricingNote}
              onChangeText={setPricingNote}
              placeholder="Seans başı 500₺, 10'lu paket 4000₺..."
              placeholderTextColor={premium.textMuted}
              multiline
            />

            {/* Save */}
            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? '⏳ Kaydediliyor...' : '✓ Değişiklikleri Kaydet'}
              </Text>
            </Pressable>
          </GlassCard>
        </Animated.View>

        {/* ─── Quick Access ─── */}
        <GlassCard style={styles.quickAccessCard}>
          <Pressable
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('TrainerMessages')}
          >
            <Text style={styles.quickAccessIcon}>💬</Text>
            <Text style={styles.quickAccessText}>Mesajlarım</Text>
            <Text style={styles.quickAccessArrow}>›</Text>
          </Pressable>
          <Pressable
            style={[styles.quickAccessItem, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('Students')}
          >
            <Text style={styles.quickAccessIcon}>👥</Text>
            <Text style={styles.quickAccessText}>Öğrencilerim</Text>
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

        {/* ─── Language ─── */}
        <GlassCard style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Dil</Text>
          <View style={styles.langSeg}>
            <Pressable
              style={[styles.langBtn, i18n.language === 'tr' && styles.langBtnOn]}
              onPress={() => {
                persistLanguage('tr').catch(() => {});
              }}
            >
              <Text style={[styles.langTxt, i18n.language === 'tr' && styles.langTxtOn]}>
                Türkçe
              </Text>
            </Pressable>
            <Pressable
              style={[styles.langBtn, i18n.language === 'en' && styles.langBtnOn]}
              onPress={() => {
                persistLanguage('en').catch(() => {});
              }}
            >
              <Text style={[styles.langTxt, i18n.language === 'en' && styles.langTxtOn]}>
                English
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* ─── Kulübe Bağlan (sadece bağımsız eğitmenler) ─── */}
        {profile?.role === 'independent_trainer' && (
          <GlassCard style={styles.quickAccessCard}>
            <View style={styles.clubConnectSection}>
              <Text style={styles.clubConnectTitle}>🏢 Kulübe Bağlan</Text>
              <Text style={styles.clubConnectHint}>
                Bir kulübün size verdiği kodu girerek başvurun
              </Text>
              <View style={styles.clubConnectRow}>
                <View style={styles.clubConnectInputWrap}>
                  <TextInput
                    style={styles.clubConnectInput}
                    value={clubCode}
                    onChangeText={(v) => setClubCode(v.toUpperCase())}
                    placeholder="KULÜP KODU"
                    placeholderTextColor={premium.textMuted}
                    autoCapitalize="characters"
                  />
                </View>
                <Pressable
                  style={[
                    styles.clubConnectBtn,
                    (!clubCode.trim() || joiningClub) && { opacity: 0.4 },
                  ]}
                  onPress={handleJoinClub}
                  disabled={!clubCode.trim() || joiningClub}
                >
                  <Text style={styles.clubConnectBtnText}>{joiningClub ? '⏳' : '→'}</Text>
                </Pressable>
              </View>
            </View>
          </GlassCard>
        )}

        {/* ─── Logout ─── */}
        <Pressable
          style={styles.logoutBtn}
          onPress={() => {
            logout().catch(() => {});
          }}
        >
          <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, maxWidth: 480, alignSelf: 'center', width: '100%' },

  // Header
  headerCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 12, position: 'relative' },
  settingsIcon: { position: 'absolute', top: 12, right: 12, padding: 8, zIndex: 1 },
  settingsIconText: { fontSize: 22 },
  avatarContainer: { alignItems: 'center', marginBottom: 16 },
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
  avatarInitials: { fontSize: 28, fontWeight: '900', color: premium.accentBlue },
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
  avatarCameraIcon: { fontSize: 14, color: '#fff' },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: premium.text,
    textAlign: 'center',
    marginTop: 12,
  },
  profileEmail: { fontSize: 13, color: premium.textMuted, textAlign: 'center', marginTop: 4 },
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
  infoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    justifyContent: 'center',
  },
  infoChip: {
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  infoChipText: { fontSize: 11, fontWeight: '600', color: premium.textMuted },

  // Edit Form
  editAnimWrap: { overflow: 'hidden', marginBottom: 0 },
  editCard: { marginBottom: 12, borderColor: 'rgba(56,189,248,0.2)', borderWidth: 1 },
  editHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  editTitleIcon: { fontSize: 18 },
  editTitle: { fontSize: 17, fontWeight: '800', color: premium.text },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.textMuted,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    borderRadius: 12,
    padding: 14,
    color: premium.text,
    fontSize: 14,
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    backgroundColor: 'rgba(148,163,184,0.04)',
  },
  chipActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.1)' },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 11, fontWeight: '600', color: premium.textMuted },
  chipTextActive: { color: premium.accentBlue },
  saveBtn: {
    backgroundColor: premium.accentBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Quick Access
  quickAccessCard: { marginBottom: 12 },
  quickAccessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(148,163,184,0.1)',
  },
  quickAccessIcon: { fontSize: 18, marginRight: 12 },
  quickAccessText: { fontSize: 15, fontWeight: '600', color: premium.text, flex: 1 },
  quickAccessArrow: { fontSize: 14, color: premium.textMuted },

  // Settings
  settingsCard: { marginBottom: 12 },
  settingsTitle: { fontSize: 15, fontWeight: '800', color: premium.text, marginBottom: 10 },
  langSeg: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  langBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  langBtnOn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  langTxt: { fontSize: 14, fontWeight: '600', color: premium.textMuted },
  langTxtOn: { color: premium.text },

  // Logout
  logoutBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: 8,
  },
  logoutBtnText: { color: premium.textMuted, fontWeight: '700', fontSize: 14 },

  // Club Connect
  clubConnectSection: { paddingVertical: 4 },
  clubConnectTitle: { fontSize: 15, fontWeight: '800', color: premium.text, marginBottom: 4 },
  clubConnectHint: { fontSize: 12, color: premium.textMuted, marginBottom: 12 },
  clubConnectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clubConnectInputWrap: { flex: 1 },
  clubConnectInput: {
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    borderRadius: 12,
    padding: 14,
    color: premium.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  clubConnectBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: premium.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubConnectBtnText: { fontSize: 20, color: '#fff', fontWeight: '800' },
});
