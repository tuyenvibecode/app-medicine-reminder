// app/_layout.tsx
// Root layout của ứng dụng Nhắc nhở uống thuốc

import '../global.css';
import React, { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';
import { setupNotificationChannels } from '@/lib/notifications';
import { AppProvider } from '@/context/AppContext';
import { NAV_THEME } from '@/theme';

// Ngăn màn hình splash tự biến mất trước khi load xong tài nguyên
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Ẩn splash screen và thiết lập kênh thông báo ngầm (không chặn hiển thị UI)
    SplashScreen.hideAsync().catch(() => {});
    setupNotificationChannels().catch(() => {});
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

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ThemeProvider value={navigationTheme}>
          <View style={{ flex: 1 }} className="flex-1 bg-background">
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
              <Stack.Screen
                name="admin/index"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="prescription/create"
                options={{
                  headerShown: false,
                }}
              />
            </Stack>
            <PortalHost />
          </View>
        </ThemeProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
