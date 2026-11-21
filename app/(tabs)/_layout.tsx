// app/(tabs)/_layout.tsx
// Thanh điều hướng đáy (Custom Floating Bottom Bar)
// Thiết kế nổi (có khoảng hở 2 bên và dưới đáy), bo tròn kiểu viên nang hiện đại,
// ở chính giữa là nút Camera nổi bật để chụp nhanh "Đơn thuốc của bạn".

import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { CalendarCheck, Pill, FileText, User, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CustomTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigateToTab?: (routeKey: string) => void;
  navigation?: {
    navigate: (name: string) => void;
  };
}

function CustomFloatingTabBar({ state, navigateToTab, navigation }: CustomTabBarProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const currentRouteName = state.routes[state.index]?.name;

  const handleNavigate = (routeName: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}

    const targetRoute = state.routes.find((r) => r.name === routeName);
    if (targetRoute && typeof navigateToTab === 'function') {
      navigateToTab(targetRoute.key);
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate(routeName);
    } else {
      const path = routeName === 'index' ? '/(tabs)' : `/(tabs)/${routeName}`;
      router.navigate(path as any);
    }
  };

  // Bấm nút Camera ở chính giữa: Mở ngay màn Đơn thuốc của bạn kèm kích hoạt Camera chụp đơn
  const handleQuickCameraCapture = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    router.push('/doctor-prescriptions?autoCapture=1' as any);
  };

  const renderTabItem = (
    routeName: string,
    label: string,
    IconComponent: typeof CalendarCheck
  ) => {
    const isFocused = currentRouteName === routeName;
    const activeColor = '#0D9488';
    const inactiveColor = isDark ? '#94A3B8' : '#64748B';

    return (
      <TouchableOpacity
        key={routeName}
        activeOpacity={0.75}
        onPress={() => handleNavigate(routeName)}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 6,
        }}
      >
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: isFocused ? 'rgba(13, 148, 136, 0.12)' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconComponent
            size={21}
            color={isFocused ? activeColor : inactiveColor}
            strokeWidth={isFocused ? 2.4 : 2}
          />
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10.5,
            fontWeight: isFocused ? '700' : '600',
            color: isFocused ? activeColor : inactiveColor,
            marginTop: 2,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 22 : 14,
        left: 16,
        right: 16,
        alignItems: 'center',
      }}
    >
      {/* Khung viên nang nổi có khoảng hở 2 bên (left: 16, right: 16) */}
      <View
        style={{
          width: '100%',
          height: 66,
          borderRadius: 28,
          backgroundColor: isDark ? '#121E21' : '#FFFFFF',
          borderWidth: 1,
          borderColor: isDark ? '#1E353B' : '#E2E8F0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {/* 2 Tab bên trái */}
        {renderTabItem('index', 'Hôm nay', CalendarCheck)}
        {renderTabItem('medications', 'Tủ thuốc', Pill)}

        {/* NÚT CAMERA NỔI Ở CHÍNH GIỮA: Chụp nhanh Đơn thuốc của bạn */}
        <View
          style={{
            width: 68,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleQuickCameraCapture}
            accessibilityLabel="Chụp nhanh đơn thuốc của bạn"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#0D9488',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: -22,
              borderWidth: 4,
              borderColor: isDark ? '#121E21' : '#FFFFFF',
              shadowColor: '#0D9488',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Camera size={24} color="#FFFFFF" strokeWidth={2.3} />
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: '#0D9488',
              marginTop: 2,
            }}
          >
            Chụp đơn
          </Text>
        </View>

        {/* 2 Tab bên phải */}
        {renderTabItem('prescription', 'Phiếu note', FileText)}
        {renderTabItem('account', 'Tài khoản', User)}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomFloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hôm nay' }} />
      <Tabs.Screen name="medications" options={{ title: 'Tủ thuốc' }} />
      <Tabs.Screen name="prescription" options={{ title: 'Phiếu note' }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản' }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
