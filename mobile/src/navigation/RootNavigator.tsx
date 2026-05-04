import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { ClubConnectScreen } from '../screens/onboarding/ClubConnectScreen';
import { LoginScreen } from '../screens/onboarding/LoginScreen';
import { RegisterScreen } from '../screens/onboarding/RegisterScreen';
import { MemberDashboardScreen } from '../screens/MemberDashboardScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { authReady, user, token, tenant } = useMemberAuth();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    if (!authReady || !navReady || !navigationRef.isReady()) {
      return;
    }
    if (user && token && tenant) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      navigationRef.reset({ index: 0, routes: [{ name: 'ClubConnect' }] });
    }
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
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MemberDashboardScreen} />
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
