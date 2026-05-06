import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { ClubConnectScreen } from '../screens/onboarding/ClubConnectScreen';
import { RegistrationTypeScreen } from '../screens/onboarding/RegistrationTypeScreen';
import { CorporateEntryScreen } from '../screens/onboarding/CorporateEntryScreen';
import { LoginScreen } from '../screens/onboarding/LoginScreen';
import { ForgotPasswordScreen } from '../screens/onboarding/ForgotPasswordScreen';
import { RegisterScreen } from '../screens/onboarding/RegisterScreen';
import { TrainerRegisterScreen } from '../screens/onboarding/TrainerRegisterScreen';
import { MemberTabNavigator } from './MemberTabNavigator';
import { MemberPendingApprovalScreen } from '../screens/MemberPendingApprovalScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const logoLight = require('../../assets/branding/wellness-club-logo-header.png');

export function RootNavigator() {
  const { authReady, user, token, tenant } = useMemberAuth();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [navReady, setNavReady] = useState(false);
  const [splashMinDone, setSplashMinDone] = useState(false);
  const lastTargetRef = useRef<string | null>(null);
  const splashAnim = useRef(new Animated.Value(0)).current;
  const showSplash = !authReady || !splashMinDone;

  useEffect(() => {
    const timer = setTimeout(() => setSplashMinDone(true), 2600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authReady || !navReady || !navigationRef.isReady()) {
      return;
    }
    let target: keyof RootStackParamList = 'ClubConnect';
    if (user && token && tenant) {
      const pending = user.accountStatus === 'pending_approval';
      target = pending ? 'PendingApproval' : 'Main';
    }
    if (lastTargetRef.current === target) {
      return;
    }
    lastTargetRef.current = target;
    navigationRef.reset({ index: 0, routes: [{ name: target }] });
  }, [authReady, navReady, user, token, tenant, navigationRef]);

  useEffect(() => {
    if (!showSplash) {
      splashAnim.stopAnimation();
      splashAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(splashAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(splashAnim, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showSplash, splashAnim]);

  if (showSplash) {
    const glowOpacity = splashAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.9],
    });
    const logoScale = splashAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.06],
    });
    const textOpacity = splashAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.75, 1],
    });
    return (
      <View style={styles.boot}>
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <Image source={logoLight} style={styles.bootLogo} />
        </Animated.View>
        <Animated.Text style={[styles.bootTitle, { opacity: textOpacity }]}>
          Wellness Club
        </Animated.Text>
        <Animated.Text style={[styles.bootSubtitle, { opacity: textOpacity }]}>
          Exclusive Fitness & Wellness Ecosystem
        </Animated.Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={() => setNavReady(true)}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#050810' },
        }}
      >
        <Stack.Screen name="ClubConnect" component={ClubConnectScreen} />
        <Stack.Screen name="RegistrationType" component={RegistrationTypeScreen} />
        <Stack.Screen name="CorporateEntry" component={CorporateEntryScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="TrainerRegister" component={TrainerRegisterScreen} />
        <Stack.Screen name="PendingApproval" component={MemberPendingApprovalScreen} />
        <Stack.Screen name="Main" component={MemberTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050810',
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(56,189,248,0.18)',
  },
  bootLogo: {
    width: 86,
    height: 86,
    borderRadius: 22,
    marginBottom: 14,
  },
  bootTitle: {
    color: '#e6f3ff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bootSubtitle: {
    marginTop: 8,
    color: '#a7bcd6',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
