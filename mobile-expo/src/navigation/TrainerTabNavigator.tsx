import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { apiJson } from '../api/client';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { TrainerDashboardScreen } from '../screens/trainer/TrainerDashboardScreen';
import { TrainerCalendarScreen } from '../screens/trainer/TrainerCalendarScreen';
import { TrainerStudentsScreen } from '../screens/trainer/TrainerStudentsScreen';
import { TrainerStudentDetailScreen } from '../screens/trainer/TrainerStudentDetailScreen';
import { TrainerMessagesScreen } from '../screens/trainer/TrainerMessagesScreen';
import { TrainerProfileScreen } from '../screens/trainer/TrainerProfileScreen';
import { MemberDiscoverScreen } from '../screens/member/MemberDiscoverScreen';
import { ChatScreen } from '../screens/member/ChatScreen';
import type { TrainerTabParamList } from './trainerTabTypes';

const Tab = createBottomTabNavigator<TrainerTabParamList>();

function tabIcon(label: string, active: boolean) {
  return (
    <Text style={[styles.tabIcon, active ? styles.tabIconActive : styles.tabIconInactive]}>
      {label}
    </Text>
  );
}

export function TrainerTabNavigator() {
  const { token, tenant } = useMemberAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!token || !tenant) return;
    try {
      const count = await apiJson<number>('/messages/unread-count', {
        token,
        tenantSubdomain: tenant.subdomain,
      });
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      /* ignore */
    }
  }, [token, tenant]);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 15000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: 'rgba(244,247,251,0.4)',
        tabBarStyle: {
          backgroundColor: '#070d18',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={MemberDiscoverScreen}
        options={{
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ focused }) => tabIcon('🔍', focused),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={TrainerCalendarScreen}
        options={{
          tabBarLabel: 'Ajanda',
          tabBarIcon: ({ focused }) => tabIcon('📅', focused),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={TrainerDashboardScreen}
        options={{
          tabBarLabel: 'Panel',
          tabBarIcon: ({ focused }) => tabIcon('🏠', focused),
        }}
      />
      <Tab.Screen
        name="Students"
        component={TrainerStudentsScreen}
        options={{
          tabBarLabel: 'Öğrenciler',
          tabBarIcon: ({ focused }) => tabIcon('👥', focused),
        }}
      />
      <Tab.Screen
        name="TrainerProfile"
        component={TrainerProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => tabIcon('👤', focused),
        }}
      />
      {/* Hidden routes */}
      <Tab.Screen
        name="TrainerMessages"
        component={TrainerMessagesScreen}
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="StudentDetail"
        component={TrainerStudentDetailScreen}
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: { fontSize: 20 },
  tabIconActive: { opacity: 1 },
  tabIconInactive: { opacity: 0.5 },
});
