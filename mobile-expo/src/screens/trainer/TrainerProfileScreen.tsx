import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';

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
  const insets = useSafeAreaInsets();
  const { user, token, tenant, logout } = useMemberAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [certifications, setCertifications] = useState('');
  const [city, setCity] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [pricingNote, setPricingNote] = useState('');

  const opts = { token: token ?? undefined, tenantSubdomain: tenant?.subdomain };

  const load = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const res = await apiJson<ProfileData>('/trainer-panel/profile', opts);
      setProfile(res);
      setBio(res.bio ?? '');
      setSpecialties((res.specialties ?? []).join(', '));
      setCertifications((res.certifications ?? []).join(', '));
      setCity(res.city ?? '');
      setExperienceYears(res.experienceYears?.toString() ?? '');
      setPricingNote(res.pricingNote ?? '');
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

  const handleSave = async () => {
    if (!bio.trim() || !city.trim()) {
      Alert.alert('Hata', 'Biyografi ve şehir zorunludur');
      return;
    }
    setSaving(true);
    try {
      await apiJson('/trainer-panel/profile', {
        ...opts,
        method: 'PATCH',
        body: JSON.stringify({
          bio: bio.trim(),
          specialties: specialties
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          certifications: certifications
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          city: city.trim(),
          experienceYears: experienceYears ? parseInt(experienceYears, 10) : null,
          pricingNote: pricingNote.trim() || null,
        }),
      });
      Alert.alert('✅', 'Profil güncellendi');
    } catch (e) {
      Alert.alert('Hata', e instanceof ApiError ? e.message : 'Güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>👤 Eğitmen Profili</Text>
        <Text style={styles.subtitle}>
          {user?.firstName} {user?.lastName} ·{' '}
          {profile?.role === 'independent_trainer' ? 'Bağımsız Eğitmen' : 'Kulüp Eğitmeni'}
        </Text>

        <GlassCard style={styles.formCard}>
          <Text style={styles.label}>Biyografi *</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={bio}
            onChangeText={setBio}
            placeholder="Kendinizi tanıtın..."
            placeholderTextColor={premium.textMuted}
            multiline
          />

          <Text style={styles.label}>Uzmanlık Alanları *</Text>
          <TextInput
            style={styles.input}
            value={specialties}
            onChangeText={setSpecialties}
            placeholder="Fitness, Pilates, Yoga (virgülle ayırın)"
            placeholderTextColor={premium.textMuted}
          />

          <Text style={styles.label}>Sertifikalar</Text>
          <TextInput
            style={styles.input}
            value={certifications}
            onChangeText={setCertifications}
            placeholder="ACE, NASM (virgülle ayırın)"
            placeholderTextColor={premium.textMuted}
          />

          <Text style={styles.label}>Şehir *</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="İstanbul"
            placeholderTextColor={premium.textMuted}
          />

          <Text style={styles.label}>Deneyim (yıl)</Text>
          <TextInput
            style={styles.input}
            value={experienceYears}
            onChangeText={setExperienceYears}
            placeholder="5"
            placeholderTextColor={premium.textMuted}
            keyboardType="number-pad"
          />

          {profile?.role === 'independent_trainer' && (
            <>
              <Text style={styles.label}>Fiyatlandırma Notu</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={pricingNote}
                onChangeText={setPricingNote}
                placeholder="Seans başı ve paket seçenekleri..."
                placeholderTextColor={premium.textMuted}
                multiline
              />
            </>
          )}

          <Pressable
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? '⏳ Kaydediliyor...' : '✓ Profili Kaydet'}
            </Text>
          </Pressable>
        </GlassCard>

        {/* Logout */}
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
  title: { fontSize: 22, fontWeight: '800', color: premium.text },
  subtitle: { fontSize: 13, color: premium.textMuted, marginTop: 4, marginBottom: 16 },
  formCard: { marginBottom: 16 },
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
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: premium.accentBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
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
});
