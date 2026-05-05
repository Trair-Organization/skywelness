import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { ClubConnectScreen } from '../screens/onboarding/ClubConnectScreen';
import { RegistrationTypeScreen } from '../screens/onboarding/RegistrationTypeScreen';
import { MemberEntryScreen } from '../screens/onboarding/MemberEntryScreen';
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
  const lastTargetRef = useRef<string | null>(null);

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

  if (!authReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#38bdf8" />
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
        <Stack.Screen name="MemberEntry" component={MemberEntryScreen} />
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
});
