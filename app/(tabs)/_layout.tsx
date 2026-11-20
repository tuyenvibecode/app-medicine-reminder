// app/(tabs)/_layout.tsx
// Cấu hình thanh điều hướng đáy (Bottom Tabs)

import React from 'react';
import { Tabs } from 'expo-router';
import { CalendarCheck, Pill, History, Settings } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { COLORS } from '@/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: isDark ? '#94A3B8' : '#64748B',
        tabBarStyle: {
          backgroundColor: isDark ? '#121E21' : '#FFFFFF',
          borderTopColor: isDark ? '#1E353B' : '#E2E8F0',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hôm nay',
          tabBarIcon: ({ color, size }) => (
            <CalendarCheck size={size || 22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'Tủ thuốc',
          tabBarIcon: ({ color, size }) => (
            <Pill size={size || 22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch sử',
          tabBarIcon: ({ color, size }) => (
            <History size={size || 22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size || 22} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
