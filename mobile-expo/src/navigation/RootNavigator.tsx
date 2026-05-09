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
import { MemberPendingApprovalScreen } from '../screens/MemberPendingApprovalScreen';
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

  // Check if intro has been seen
  useEffect(() => {
    hasSeenIntro()
      .then((seen) => {
        setShowIntro(!seen);
        setIntroChecked(true);
      })
      .catch(() => setIntroChecked(true));
  }, []);

  useEffect(() => {
    if (!authReady || !navReady || !introChecked || !navigationRef.isReady()) {
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
      target = pending ? 'PendingApproval' : 'Main';
    }
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
        <Stack.Screen name="Main" component={MemberTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
