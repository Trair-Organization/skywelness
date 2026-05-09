import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text } from 'react-native';
import { apiJson } from '../api/client';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { MemberHomeScreen } from '../screens/member/MemberHomeScreen';
import { MemberEventsScreen } from '../screens/member/MemberEventsScreen';
import {
  MemberMassageScreen,
  MemberSpecialLessonsScreen,
} from '../screens/member/MemberServiceHubScreen';
import { MemberProfileScreen } from '../screens/member/MemberProfileScreen';
import { MemberReservationsScreen } from '../screens/member/MemberReservationsScreen';
import { MemberTrainerNetworkScreen } from '../screens/member/MemberTrainerNetworkScreen';
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
          tabBarIcon: ({ focused }) => tabIcon('⌂', focused),
        }}
      />
      <Tab.Screen
        name="Reservations"
        component={MemberReservationsScreen}
        options={{
          tabBarLabel: t('tabs.reservations'),
          tabBarIcon: ({ focused }) => tabIcon('◷', focused),
        }}
      />
      <Tab.Screen
        name="SpecialLessons"
        component={MemberSpecialLessonsScreen}
        options={{
          tabBarLabel: t('tabs.specialLessons'),
          tabBarIcon: ({ focused }) => tabIcon('◆', focused),
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
        name="Events"
        component={MemberEventsScreen}
        options={{
          tabBarLabel: t('tabs.events'),
          tabBarIcon: ({ focused }) => tabIcon('◎', focused),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={MemberNotificationsScreen}
        options={{
          // Notifications are opened from the bell button in Home.
          // Keep this route mounted, but hide it from the bottom tab bar.
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Network"
        component={MemberTrainerNetworkScreen}
        options={{
          tabBarLabel: t('tabs.network'),
          tabBarIcon: ({ focused }) => tabIcon('◉', focused),
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
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Legal"
        component={LegalScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={MemberProfileScreen}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ focused }) => tabIcon('●', focused),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 16,
    marginBottom: -2,
  },
  tabIconActive: {
    color: '#38bdf8',
  },
  tabIconInactive: {
    color: 'rgba(244,247,251,0.35)',
  },
});
