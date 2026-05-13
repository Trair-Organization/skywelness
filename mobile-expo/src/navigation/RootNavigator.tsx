import { useEffect, useRef, useState } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { AnimatedSplash } from '../components/premium/AnimatedSplash';
import { IntroWalkthroughScreen, hasSeenIntro } from '../screens/onboarding/IntroWalkthroughScreen';
import { ClubConnectScreen } from '../screens/onboarding/ClubConnectScreen';
import { RegistrationTypeScreen } from '../screens/onboarding/RegistrationTypeScreen';
import { CorporateEntryScreen } from '../screens/onboarding/CorporateEntryScreen';
import { LoginScreen } from '../screens/onboarding/LoginScreen';
import { ForgotPasswordScreen } from '../screens/onboarding/ForgotPasswordScreen';
import { RegisterScreen } from '../screens/onboarding/RegisterScreen';
import { TrainerRegisterScreen } from '../screens/onboarding/TrainerRegisterScreen';
import { MemberTabNavigator } from './MemberTabNavigator';
import { TrainerTabNavigator } from './TrainerTabNavigator';
import { MemberPendingApprovalScreen } from '../screens/MemberPendingApprovalScreen';
import { PartnerProfileScreen } from '../screens/member/PartnerProfileScreen';
import { TrainerDetailScreen } from '../screens/member/TrainerDetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { authReady, user, token, tenant } = useMemberAuth();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [navReady, setNavReady] = useState(false);
  const [splashMinDone, setSplashMinDone] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const lastTargetRef = useRef<string | null>(null);
  const showSplash = !authReady || !splashMinDone || !introChecked;

  useEffect(() => {
    const timer = setTimeout(() => setSplashMinDone(true), 2600);
    return () => clearTimeout(timer);
  }, []);

  // Check if intro has been seen — skip intro for now (Apple review prep)
  useEffect(() => {
    setShowIntro(false);
    setIntroChecked(true);
  }, []);

  useEffect(() => {
    console.log('[NAV] effect check', {
      authReady,
      navReady,
      introChecked,
      showIntro,
      hasUser: !!user,
      hasToken: !!token,
      hasTenant: !!tenant,
    });
    if (!authReady || !navReady || !introChecked || !navigationRef.isReady()) {
      console.log('[NAV] early return', {
        authReady,
        navReady,
        introChecked,
        navIsReady: navigationRef.isReady?.(),
      });
      return;
    }
    // If intro hasn't been seen, show it first
    if (showIntro) {
      if (lastTargetRef.current !== 'Intro') {
        lastTargetRef.current = 'Intro';
        navigationRef.reset({ index: 0, routes: [{ name: 'Intro' }] });
      }
      return;
    }
    let target: keyof RootStackParamList = 'ClubConnect';
    if (user && token && tenant) {
      const pending = user.accountStatus === 'pending_approval';
      if (pending) {
        target = 'PendingApproval';
      } else if (user.role === 'trainer' || user.role === 'independent_trainer') {
        target = 'TrainerMain';
      } else {
        target = 'Main';
      }
    }
    console.log('[NAV] effect', {
      target,
      last: lastTargetRef.current,
      hasUser: !!user,
      hasToken: !!token,
      hasTenant: !!tenant,
      status: user?.accountStatus,
    });
    if (lastTargetRef.current === target) {
      return;
    }
    lastTargetRef.current = target;
    navigationRef.reset({ index: 0, routes: [{ name: target }] });
  }, [authReady, navReady, introChecked, showIntro, user, token, tenant, navigationRef]);

  if (showSplash) {
    return <AnimatedSplash />;
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
        <Stack.Screen name="Intro" component={IntroWalkthroughScreen} />
        <Stack.Screen name="ClubConnect" component={ClubConnectScreen} />
        <Stack.Screen name="RegistrationType" component={RegistrationTypeScreen} />
        <Stack.Screen name="CorporateEntry" component={CorporateEntryScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="TrainerRegister" component={TrainerRegisterScreen} />
        <Stack.Screen name="PendingApproval" component={MemberPendingApprovalScreen} />
        <Stack.Screen name="PartnerProfile" component={PartnerProfileScreen} />
        <Stack.Screen name="TrainerDetail" component={TrainerDetailScreen} />
        <Stack.Screen name="Main" component={MemberTabNavigator} />
        <Stack.Screen name="TrainerMain" component={TrainerTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
