import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MemberAuthProvider } from './src/auth/MemberAuthContext';
import { loadStoredLanguage } from './src/i18n';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ensurePushNotificationsEnabled } from './src/notifications/push';

function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    loadStoredLanguage().finally(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    ensurePushNotificationsEnabled().catch(() => {});
  }, []);

  if (!i18nReady) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <View style={styles.boot}>
            <ActivityIndicator size="large" color="#38bdf8" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <MemberAuthProvider>
          <StatusBar barStyle="light-content" />
          <RootNavigator />
        </MemberAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: {
    flex: 1,
    backgroundColor: '#050810',
  },
});

export default App;
