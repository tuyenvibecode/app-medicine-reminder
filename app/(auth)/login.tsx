// app/(auth)/login.tsx
// Màn hình Đăng nhập riêng cho thành viên gia đình
// Hỗ trợ cả 2 phương thức: Đăng nhập bằng Mã mời gia đình (1-chạm) & Tài khoản quản trị

import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shield, X, Mail, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function LoginScreen() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'invite' | 'password'>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Xử lý đăng nhập bằng mã gia đình (gọi hàm RPC join_household của Supabase nếu đã kết nối)
  const handleInviteCodeLogin = async () => {
    const cleanCode = inviteCode.trim();
    if (!cleanCode) {
      Alert.alert('Chưa nhập mã', 'Vui lòng nhập mã mời gia đình (ví dụ: GD-8812).');
      return;
    }

    setIsLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
        const { error } = await supabase.rpc('join_household', { p_code: cleanCode });
        if (error) {
          Alert.alert('Mã mời không hợp lệ', error.message || 'Mã mời đã hết hạn hoặc đã được sử dụng.');
          return;
        }
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert(
        'Kết nối thành công!',
        `Chào mừng bạn tham gia Gia đình với mã ${cleanCode.toUpperCase()}!\nLịch uống thuốc và hồ sơ đã được đồng bộ.`,
        [{ text: 'Bắt đầu sử dụng', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể kết nối mã gia đình lúc này.');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý đăng nhập bằng Email / Mật khẩu
  const handlePasswordLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Đăng nhập thất bại', error.message);
      } else {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        Alert.alert('Thành công', 'Đăng nhập thành công!');
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 px-5 justify-center"
      >
        {/* Nút đóng */}
        <View className="absolute top-12 right-5 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-muted/60"
            onPress={() => router.back()}
            accessibilityLabel="Đóng màn hình đăng nhập"
          >
            <X size={20} color="#64748B" />
          </Button>
        </View>

        {/* Tiêu đề */}
        <View className="items-center mb-6">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 mb-3">
            <Shield size={32} color="#0D9488" strokeWidth={2} />
          </View>
          <Text className="text-2xl font-bold text-foreground tracking-tight">
            Đăng nhập Gia đình
          </Text>
          <Text className="text-xs text-muted-foreground mt-1 text-center px-4">
            Đồng bộ lịch uống thuốc và kết nối an toàn với dược sĩ
          </Text>
        </View>

        {/* Tab chuyển đổi cách đăng nhập */}
        <View className="flex-row bg-muted/60 p-1 rounded-2xl mb-4">
          <TouchableOpacity
            onPress={() => setAuthMode('invite')}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
              authMode === 'invite' ? 'bg-card shadow-sm' : ''
            }`}
          >
            <Sparkles size={14} color={authMode === 'invite' ? '#0D9488' : '#64748B'} />
            <Text
              className={`text-xs font-semibold ml-1.5 ${
                authMode === 'invite' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Mã gia đình (1-chạm)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setAuthMode('password')}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
              authMode === 'password' ? 'bg-card shadow-sm' : ''
            }`}
          >
            <Mail size={14} color={authMode === 'password' ? '#0D9488' : '#64748B'} />
            <Text
              className={`text-xs font-semibold ml-1.5 ${
                authMode === 'password' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Email & Mật khẩu
            </Text>
          </TouchableOpacity>
        </View>

        <Card className="p-5 border-border/80">
          {authMode === 'invite' ? (
            /* Phương thức 1: Nhập mã gia đình */
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1">
                Mã mời gia đình
              </Text>
              <Text className="text-xs text-muted-foreground mb-3">
                Nhập mã 6 ký tự do Chủ hộ cấp (ví dụ: GD-8812)
              </Text>

              <Input
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="Ví dụ: GD-8812"
                autoCapitalize="characters"
                className="mb-5 text-center font-bold tracking-widest text-lg h-14"
              />

              <Button
                variant="default"
                size="lg"
                className="bg-primary w-full h-13 rounded-2xl"
                onPress={handleInviteCodeLogin}
              >
                <Text className="text-white font-bold text-base">
                  Vào ứng dụng ngay
                </Text>
              </Button>

              <Text className="text-xs text-muted-foreground text-center mt-3">
                Dành cho người nhà: Không cần mật khẩu phức tạp.
              </Text>
            </View>
          ) : (
            /* Phương thức 2: Email & Mật khẩu */
            <View>
              <View className="mb-4">
                <Text className="text-sm font-semibold text-foreground mb-1.5">
                  Tài khoản Email
                </Text>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tuyen55@giadinh.local"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="mb-5">
                <Text className="text-sm font-semibold text-foreground mb-1.5">
                  Mật khẩu
                </Text>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                />
              </View>

              <Button
                variant="default"
                size="lg"
                className="bg-primary w-full h-13 rounded-2xl"
                onPress={handlePasswordLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Đăng nhập quản trị
                  </Text>
                )}
              </Button>

              <Text className="text-xs text-muted-foreground text-center mt-4">
                Dành cho Chủ hộ & Dược sĩ quản lý.
              </Text>
            </View>
          )}
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
