import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text } from 'react-native';
import { MemberHomeScreen } from '../screens/member/MemberHomeScreen';
import { MemberMessagesScreen } from '../screens/member/MemberMessagesScreen';
import { MemberNotificationsScreen } from '../screens/member/MemberNotificationsScreen';
import { MemberProfileScreen } from '../screens/member/MemberProfileScreen';
import { MemberReservationsScreen } from '../screens/member/MemberReservationsScreen';
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
        name="Notifications"
        component={MemberNotificationsScreen}
        options={{
          tabBarLabel: t('tabs.notifications'),
          tabBarIcon: ({ focused }) => tabIcon('◆', focused),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MemberMessagesScreen}
        options={{
          tabBarLabel: t('tabs.messages'),
          tabBarIcon: ({ focused }) => tabIcon('✉', focused),
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
