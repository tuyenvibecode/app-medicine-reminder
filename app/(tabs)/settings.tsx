// app/(tabs)/settings.tsx
// Màn hình Cài đặt & Bảo mật
// Tích hợp khoá ứng dụng bằng vân tay/PIN (expo-local-authentication) và cấu hình nhắc thuốc

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShieldCheck,
  Bell,
  Fingerprint,
  EyeOff,
  Users,
  Info,
  LogOut,
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsScreen() {
  const router = useRouter();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [hideDetailsOnLock, setHideDetailsOnLock] = useState(false);
  const [highPriorityAlarm, setHighPriorityAlarm] = useState(true);

  // Xử lý bật/tắt sinh trắc học
  const handleToggleBiometrics = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Không khả dụng',
          'Thiết bị chưa cài đặt vân tay hoặc khuôn mặt trong Cài đặt hệ thống.'
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực vân tay/khuôn mặt để bảo vệ ứng dụng',
        cancelLabel: 'Huỷ',
      });

      if (result.success) {
        setBiometricsEnabled(true);
        Alert.alert('Thành công', 'Đã bật bảo vệ bằng sinh trắc học.');
      }
    } else {
      setBiometricsEnabled(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="pb-3">
          <Text className="text-xs font-semibold text-primary uppercase tracking-wider">
            Tuỳ chỉnh
          </Text>
          <Text className="text-2xl font-bold text-foreground tracking-tight">
            Cài đặt
          </Text>
        </View>

        {/* 1. Phần Thông báo & Nhắc nhở */}
        <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
          Nhắc nhở & Báo thức
        </Text>
        <Card className="mb-5 p-4 border-border/80">
          <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
            <View className="flex-row items-center flex-1 mr-3">
              <Bell size={20} color="#0D9488" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-foreground">
                  Chuông báo ưu tiên cao
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Bật âm thanh và rung báo thức đúng giờ
                </Text>
              </View>
            </View>
            <Switch
              value={highPriorityAlarm}
              onValueChange={setHighPriorityAlarm}
              trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
            />
          </View>

          <View className="flex-row items-center justify-between pt-3">
            <View className="flex-row items-center flex-1 mr-3">
              <EyeOff size={20} color="#0D9488" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-foreground">
                  Ẩn tên thuốc ở màn hình khoá
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Chỉ hiện "Đến giờ uống thuốc" để tăng tính riêng tư
                </Text>
              </View>
            </View>
            <Switch
              value={hideDetailsOnLock}
              onValueChange={setHideDetailsOnLock}
              trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
            />
          </View>
        </Card>

        {/* 2. Phần Bảo mật */}
        <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
          Bảo mật dữ liệu
        </Text>
        <Card className="mb-5 p-4 border-border/80">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-3">
              <Fingerprint size={20} color="#0D9488" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-foreground">
                  Khoá bằng vân tay / PIN
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Yêu cầu xác thực mỗi khi mở ứng dụng
                </Text>
              </View>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
            />
          </View>
        </Card>

        {/* 3. Tài khoản & Gia đình */}
        <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
          Tài khoản & Gia đình
        </Text>
        <Card className="mb-5 p-4 border-border/80">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Users size={20} color="#0D9488" />
              <View className="ml-3">
                <Text className="text-base font-semibold text-foreground">
                  Gia đình
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Quản lý thành viên & dược sĩ gia đình
                </Text>
              </View>
            </View>

            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 rounded-xl"
              onPress={() => router.push('/(auth)/login')}
            >
              <Text className="text-xs font-semibold text-foreground">Đăng nhập</Text>
            </Button>
          </View>
        </Card>

        {/* 4. Giới thiệu ứng dụng */}
        <Card className="p-4 border-border/60 bg-muted/40 mb-6">
          <View className="flex-row items-center">
            <ShieldCheck size={18} color="#0D9488" />
            <Text className="text-xs font-semibold text-primary ml-1.5">
              Bảo mật sức khoẻ cá nhân
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Dữ liệu nhắc thuốc lưu trên thiết bị của bạn. Thông báo luôn hoạt động ngay cả khi không có mạng.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
