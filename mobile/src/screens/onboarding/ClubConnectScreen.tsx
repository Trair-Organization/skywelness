import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { GlowButton } from '../../components/premium/GlowButton';
import { PremiumInput } from '../../components/premium/PremiumInput';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';
import { persistLanguage } from '../../i18n';

const logoDark = require('../../../assets/branding/wellness-club-logo-header-dark.png');

type Nav = NativeStackNavigationProp<RootStackParamList, 'ClubConnect'>;

export function ClubConnectScreen() {
  const { t, i18n } = useTranslation();
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
  const runSafe = (fn?: () => Promise<unknown> | unknown) => {
    if (typeof fn !== 'function') {
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
        <View style={styles.top}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={t('appTitle')}
            source={logoDark}
            style={styles.logo}
          />
          <Text style={styles.headline}>{t('onboarding.clubHeadline')}</Text>
          <Text style={styles.sub}>{t('onboarding.clubSubtitle')}</Text>
        </View>

        <View style={styles.langRow}>
          <Text style={styles.langLabel}>{t('lang.label')}</Text>
          <View style={styles.langSeg}>
            <Pressable
              accessibilityRole="button"
              style={[styles.langBtn, i18n.language === 'tr' && styles.langBtnOn]}
              onPress={() => {
                runSafe(() => persistLanguage('tr'));
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
                runSafe(() => persistLanguage('en'));
              }}
            >
              <Text style={[styles.langTxt, i18n.language === 'en' && styles.langTxtOn]}>
                {t('lang.en')}
              </Text>
            </Pressable>
          </View>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.cardHint}>{t('tenant.directoryHint')}</Text>
          <Pressable
            style={({ pressed }) => [styles.outlineBtn, pressed && styles.outlinePressed]}
            onPress={() => {
              const next = !listOpen;
              setListOpen(next);
              if (next) {
                runSafe(loadTenantDirectory);
              }
            }}
            disabled={loadingTenantDir}
          >
            {loadingTenantDir ? (
              <ActivityIndicator color={premium.accentBlue} />
            ) : (
              <Text style={styles.outlineTxt}>
                {listOpen ? t('tenant.hideClubs') : t('tenant.listClubs')}
              </Text>
            )}
          </Pressable>

          {listOpen && tenantDirectory.length > 0 ? (
            <View style={styles.list}>
              {tenantDirectory.map((row) => (
                <Pressable
                  key={row.id}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => {
                    runSafe(async () => {
                      const ok = await resolveTenantByCode(row.subdomain);
                      if (ok) {
                        setListOpen(false);
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
          ) : null}

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
            onPress={() => {
              runSafe(resolveTenantByCode);
            }}
            disabled={loadingTenant}
          >
            {loadingTenant ? (
              <ActivityIndicator color={premium.accentGreen} />
            ) : (
              <Text style={styles.outlineTxt}>{t('tenant.load')}</Text>
            )}
          </Pressable>

          {tenant ? (
            <View style={styles.chip}>
              <Text style={styles.chipMark}>✓</Text>
              <View style={styles.chipBody}>
                <Text style={styles.chipLabel}>{t('tenant.connected')}</Text>
                <Text style={styles.chipName}>
                  {tenant.name} · {tenant.subdomain}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.continueWrap}>
            <GlowButton
              label={t('onboarding.continue')}
              onPress={() => {
                runSafe(handleContinue);
              }}
              loading={loadingTenant}
              disabled={loadingTenant || (!tenant && !subdomain.trim())}
            />
          </View>
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
  top: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 20,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: premium.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 10,
    fontSize: 16,
    color: premium.textMuted,
    textAlign: 'center',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  langLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: premium.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  langSeg: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  langBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  langBtnOn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  langTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: premium.textMuted,
  },
  langTxtOn: {
    color: premium.text,
  },
  card: {
    marginTop: 4,
    paddingBottom: 26,
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 19,
    color: premium.textMuted,
    marginBottom: 14,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  outlinePressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  outlineTxt: {
    color: premium.accentBlue,
    fontWeight: '700',
    fontSize: 15,
  },
  list: {
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    overflow: 'hidden',
    marginBottom: 12,
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: premium.radiusSm,
    padding: 14,
    marginBottom: 16,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
    gap: 12,
  },
  chipMark: {
    fontSize: 18,
    color: premium.accentGreen,
    fontWeight: '700',
  },
  chipBody: { flex: 1 },
  chipLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: premium.accentGreen,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chipName: {
    fontSize: 15,
    fontWeight: '600',
    color: premium.text,
    marginTop: 2,
  },
  continueWrap: {
    marginTop: 8,
  },
});
