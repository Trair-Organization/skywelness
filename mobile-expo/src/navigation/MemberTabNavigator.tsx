import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text } from 'react-native';
import { apiJson } from '../api/client';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { MemberHomeScreen } from '../screens/member/MemberHomeScreen';
import { MemberDiscoverScreen } from '../screens/member/MemberDiscoverScreen';
import { MemberProfileScreen } from '../screens/member/MemberProfileScreen';
import { MemberNotificationsScreen } from '../screens/member/MemberNotificationsScreen';
import { MessagesScreen } from '../screens/member/MessagesScreen';
import { ChatScreen } from '../screens/member/ChatScreen';
import { LegalScreen } from '../screens/member/LegalScreen';
import { SpaScreen } from '../screens/member/SpaScreen';
import type { MemberTabParamList } from './memberTabTypes';

const Tab = createBottomTabNavigator<MemberTabParamList>();

function tabIcon(label: string, active: boolean) {
  return (
    <Text style={[styles.tabIcon, active ? styles.tabIconActive : styles.tabIconInactive]}>
      {label}
    </Text>
  );
}

export function MemberTabNavigator() {
  const { t } = useTranslation();
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
          borderTopColor: 'rgba(148,163,184,0.22)',
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: Platform.OS === 'ios' ? 2 : 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={MemberHomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ focused }) => tabIcon('🏠', focused),
        }}
      />
      <Tab.Screen
        name="Discover"
        component={MemberDiscoverScreen}
        options={{
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ focused }) => tabIcon('🔍', focused),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: t('tabs.messages'),
          tabBarIcon: ({ focused }) => tabIcon('💬', focused),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 10, fontWeight: '800' },
        }}
      />
      <Tab.Screen
        name="Massage"
        component={SpaScreen}
        options={{
          tabBarLabel: 'Spa',
          tabBarIcon: ({ focused }) => tabIcon('🧖', focused),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={MemberProfileScreen}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ focused }) => tabIcon('👤', focused),
        }}
      />
      {/* Hidden routes (no tab bar button) */}
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Legal" component={LegalScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen
        name="Notifications"
        component={MemberNotificationsScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 18,
    marginBottom: -2,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabIconInactive: {
    opacity: 0.5,
  },
});
