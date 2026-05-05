import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { PremiumInput } from '../../components/premium/PremiumInput';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MemberEntry'>;

export function MemberEntryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {
    subdomain,
    setSubdomain,
    tenant,
    tenantDirectory,
    loadingTenant,
    loadingTenantDir,
    resolveTenantByCode,
    loadTenantDirectory,
  } = useMemberAuth();
  const [listOpen, setListOpen] = useState(false);
  const [clubQuery, setClubQuery] = useState('');

  const filteredDirectory = useMemo(() => {
    const q = clubQuery.trim().toLowerCase();
    if (!q) {
      return tenantDirectory;
    }
    return tenantDirectory.filter(
      (row) => row.name.toLowerCase().includes(q) || row.subdomain.toLowerCase().includes(q),
    );
  }, [clubQuery, tenantDirectory]);

  const runSafe = (fn?: () => Promise<unknown> | unknown) => {
    if (!fn) {
      return;
    }
    Promise.resolve(fn()).catch(() => {});
  };

  const handleContinue = async () => {
    if (tenant) {
      navigation.navigate('Login');
      return;
    }
    const ok = await resolveTenantByCode();
    if (ok) {
      navigation.navigate('Login');
    }
  };

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => navigation.navigate('RegistrationType')}>
          <Text style={styles.backTxt}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('registration.memberTitle')}</Text>
        <Text style={styles.sub}>{t('registration.memberSubtitle')}</Text>

        <GlassCard style={styles.card}>
          <Text style={styles.optionalInfo}>{t('registration.memberOptionalClub')}</Text>
          <Text style={styles.cardHint}>{t('tenant.directoryHint')}</Text>
          <Text style={styles.listTitle}>{t('tenant.listClubs')}</Text>
          <View style={styles.dropdownArea}>
            <Pressable
              style={({ pressed }) => [styles.outlineBtn, pressed && styles.outlinePressed]}
              onPress={() => {
                const next = !listOpen;
                setListOpen(next);
                if (next) {
                  runSafe(loadTenantDirectory);
                } else {
                  setClubQuery('');
                }
              }}
              disabled={loadingTenantDir}
            >
              {loadingTenantDir ? (
                <ActivityIndicator color={premium.accentBlue} />
              ) : (
                <View style={styles.listBtnContent}>
                  <Text style={styles.listBtnText}>
                    {tenant?.name ?? t('tenant.searchPlaceholder')}
                  </Text>
                  <Text style={styles.listBtnIcon}>{listOpen ? '▴' : '▾'}</Text>
                </View>
              )}
            </Pressable>

            {listOpen ? (
              <View style={styles.listOverlay}>
                <View style={styles.list}>
                  <PremiumInput
                    label={t('tenant.searchLabel')}
                    value={clubQuery}
                    onChangeText={setClubQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={t('tenant.searchPlaceholder')}
                    containerStyle={styles.searchWrap}
                    inputWrapStyle={styles.searchInputWrap}
                    style={styles.searchInput}
                  />
                  {filteredDirectory.map((row) => (
                    <Pressable
                      key={row.id}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => {
                        runSafe(async () => {
                          const ok = await resolveTenantByCode(row.subdomain);
                          if (ok) {
                            setListOpen(false);
                            setClubQuery('');
                            Keyboard.dismiss();
                            navigation.navigate('Login');
                          }
                        });
                      }}
                    >
                      <Text style={styles.rowName}>{row.name}</Text>
                      <Text style={styles.rowCode}>{row.subdomain}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          <PremiumInput
            label={t('tenant.subdomainLabel')}
            value={subdomain}
            onChangeText={setSubdomain}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('tenant.placeholder')}
          />

          <Pressable
            style={({ pressed }) => [styles.outlineBtn, pressed && styles.outlinePressed]}
            onPress={() => runSafe(handleContinue)}
            disabled={loadingTenant}
          >
            {loadingTenant ? (
              <ActivityIndicator color={premium.accentGreen} />
            ) : (
              <Text style={styles.outlineTxt}>{t('onboarding.primaryCta')}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              navigation.navigate('Register');
            }}
          >
            <Text style={styles.secondaryTxt}>{t('registration.continueWithoutClub')}</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
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
    marginTop: 2,
    paddingBottom: 24,
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 19,
    color: premium.textMuted,
    marginBottom: 14,
  },
  optionalInfo: {
    color: premium.accentBlue,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: premium.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dropdownArea: {
    position: 'relative',
    zIndex: 20,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 58,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  outlinePressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  outlineTxt: {
    color: premium.accentGreen,
    fontWeight: '700',
    fontSize: 17,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginTop: 2,
  },
  secondaryTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  listBtnContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listBtnText: {
    color: premium.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  listBtnIcon: {
    color: premium.textMuted,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 26,
  },
  listOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 62,
    zIndex: 30,
  },
  list: {
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    overflow: 'hidden',
    maxHeight: 240,
    backgroundColor: 'rgba(4,13,24,0.98)',
    paddingTop: 8,
  },
  searchWrap: {
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  searchInputWrap: {
    minHeight: 44,
  },
  searchInput: {
    fontSize: 14,
    paddingVertical: 10,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: premium.text,
  },
  rowCode: {
    fontSize: 12,
    color: premium.textMuted,
    marginTop: 2,
  },
});
