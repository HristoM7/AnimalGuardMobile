import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: Platform.select({ ios: 0, android: 14, default: 10 }),
          height: Platform.select({ ios: 84, android: 78, default: 72 }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginBottom: Platform.select({ ios: 0, android: 2, default: 4 }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Начало',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'На живо',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="video.fill" color={color} />,
        }}
      />
      <Tabs.Screen name="device" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}