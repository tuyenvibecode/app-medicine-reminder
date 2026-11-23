// app/(tabs)/_layout.tsx
// Thanh điều hướng đáy (Custom Floating Bottom Bar)
// Chuẩn tỷ lệ Mobile UI hiện đại: Bo góc vừa phải (18px đồng bộ với Card), khoảng hở 2 bên cân đối (14px),
// nút Camera squircle (bo góc 15px) tinh tế ở chính giữa để chụp nhanh "Đơn thuốc của bạn".

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
    } catch { }

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
    } catch { }
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
          height: '100%',
        }}
      >
        <IconComponent
          size={20}
          color={isFocused ? activeColor : inactiveColor}
          strokeWidth={isFocused ? 2.4 : 1.9}
        />
        <Text
          numberOfLines={1}
          style={{
            fontSize: 11,
            fontWeight: isFocused ? '700' : '500',
            color: isFocused ? activeColor : inactiveColor,
            marginTop: 4,
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
        bottom: Platform.OS === 'ios' ? 20 : 12,
        left: 14,
        right: 14,
        alignItems: 'center',
      }}
    >
      {/* Thanh điều hướng nổi chuẩn tỷ lệ Mobile UI: bo góc 18px vừa vặn, không bị tròn quá mức */}
      <View
        style={{
          width: '100%',
          height: 62,
          borderRadius: 18,
          backgroundColor: isDark ? '#121E21' : '#FFFFFF',
          borderWidth: 1,
          borderColor: isDark ? '#1E353B' : '#E2E8F0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 6,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        {/* 2 Tab bên trái */}
        {renderTabItem('index', 'Hôm nay', CalendarCheck)}
        {renderTabItem('medications', 'Tủ thuốc', Pill)}

        {/* NÚT CAMERA Ở CHÍNH GIỮA: Dạng Squircle (bo góc 14px) đồng bộ với khung 18px của thanh bar */}
        <View
          style={{
            width: 60,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleQuickCameraCapture}
            accessibilityLabel="Chụp nhanh đơn thuốc của bạn"
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: '#0D9488',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#0D9488',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Camera size={22} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
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
    </Tabs>
  );
}
