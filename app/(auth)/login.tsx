// app/(auth)/login.tsx
// Màn hình Đăng nhập tài khoản Supabase an toàn

import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Lock, Mail, Shield, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
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
          >
            <X size={20} color="#64748B" />
          </Button>
        </View>

        <View className="items-center mb-8">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 mb-3">
            <Shield size={32} color="#0D9488" strokeWidth={2} />
          </View>
          <Text className="text-2xl font-bold text-foreground tracking-tight">
            Đăng nhập tài khoản
          </Text>
          <Text className="text-sm text-muted-foreground mt-1 text-center px-4">
            Đồng bộ lịch uống thuốc và kết nối với dược sĩ trong gia đình
          </Text>
        </View>

        <Card className="p-5 border-border/80">
          {/* Email input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-foreground mb-1.5">
              Email
            </Text>
            <View className="relative justify-center">
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="ten@vidu.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password input */}
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

          {/* Nút đăng nhập */}
          <Button
            variant="default"
            size="lg"
            className="bg-primary w-full h-13 rounded-2xl"
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Đăng nhập
              </Text>
            )}
          </Button>

          {/* Lưu ý bảo mật */}
          <Text className="text-xs text-muted-foreground text-center mt-4">
            App cá nhân & gia đình: Tài khoản được cấp bởi quản trị viên.
          </Text>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
