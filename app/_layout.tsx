// app/_layout.tsx
// Root layout của ứng dụng Nhắc nhở uống thuốc

import '../global.css';
import React, { useEffect, useState } from 'react';
import { View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';
import { setupNotificationChannels } from '@/lib/notifications';
import { NAV_THEME } from '@/theme';

// Ngăn màn hình splash tự biến mất trước khi load xong tài nguyên
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 phút
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Thiết lập channel thông báo local ngay khi khởi động
        await setupNotificationChannels();
      } catch (e) {
        // Log lỗi nhẹ nhàng
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepare();
  }, []);

  const isDark = colorScheme === 'dark';
  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          ...NAV_THEME.dark.colors,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          ...NAV_THEME.light.colors,
        },
      };

  if (!isReady) {
    return <View className="flex-1 bg-background" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <View className="flex-1 bg-background">
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="(auth)/login"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="medication/add"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </Stack>
          <PortalHost />
        </View>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
