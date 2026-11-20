// app/(tabs)/account.tsx
// Màn hình "Tài khoản" & Trung tâm Quản trị Gia đình

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Shield,
  Users,
  KeyRound,
  LogOut,
  ChevronRight,
  Sparkles,
  QrCode,
  Lock,
  Settings,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function AccountScreen() {
  const router = useRouter();

  // Trạng thái mô phỏng: Đã đăng nhập với tư cách Chủ gia đình / Admin
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Xử lý đăng xuất
  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
          setIsLoggedIn(false);
        },
      },
    ]);
  };

  // Đăng nhập nhanh bằng Mã mời gia đình
  const handleLoginByInviteCode = () => {
    if (!inviteCodeInput.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã gia đình 6 ký tự.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    Alert.alert('Thành công', 'Đã kết nối vào Gia đình! Hồ sơ sức khoẻ đã được đồng bộ.');
    setIsLoggedIn(true);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="pb-3">
          <Text className="text-xs font-semibold text-primary uppercase tracking-wider">
            Cá nhân
          </Text>
          <Text className="text-2xl font-bold text-foreground tracking-tight">
            Tài khoản
          </Text>
        </View>

        {isLoggedIn ? (
          /* TRƯỜNG HỢP: ĐÃ ĐĂNG NHẬP */
          <View>
            {/* 1. Thẻ thông tin người dùng */}
            <Card className="mb-5 p-5 border-border/80">
              <View className="flex-row items-center">
                {/* Avatar */}
                <View className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/30 items-center justify-center">
                  <User size={32} color="#0D9488" strokeWidth={2} />
                </View>

                {/* Thông tin */}
                <View className="ml-4 flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-lg font-bold text-foreground">
                      Tuyến (tuyen55)
                    </Text>
                    <Badge variant="default" label="Chủ hộ" className="ml-2" />
                  </View>
                  <Text className="text-sm text-muted-foreground mt-0.5">
                    tuyen55@giadinh.local
                  </Text>
                  <Text className="text-xs text-primary font-medium mt-1">
                    Quản trị viên gia đình
                  </Text>
                </View>
              </View>
            </Card>

            {/* 2. MỤC NỔI BẬT: TRANG QUẢN TRỊ THÀNH VIÊN GIA ĐÌNH */}
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
              Trung tâm Quản trị
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/admin' as any)}
              activeOpacity={0.7}
              className="mb-5"
            >
              <Card className="p-4 border-primary/30 bg-card">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                      <Users size={22} color="#0D9488" strokeWidth={2} />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center flex-wrap">
                        <Text className="text-base font-bold text-foreground mr-2">
                          Trang Quản trị Gia đình
                        </Text>
                        <Badge variant="default" label="Quản trị" />
                      </View>
                      <Text className="text-xs text-muted-foreground mt-1" numberOfLines={2}>
                        Quản lý tài khoản người nhà, cấp mã mời & phân quyền
                      </Text>
                    </View>
                  </View>
                  <View className="w-6 items-end justify-center">
                    <ChevronRight size={20} color="#0D9488" />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>

            {/* 3. Tiện ích & Bảo mật tài khoản */}
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
              Bảo mật & Cấu hình
            </Text>
            <Card className="mb-5 p-4 border-border/80">
              {/* Đổi mật khẩu */}
              <TouchableOpacity
                className="flex-row items-center justify-between py-3 border-b border-border/50"
                onPress={() => Alert.alert('Đổi mật khẩu', 'Tính năng cho phép đổi mật khẩu tài khoản.')}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <KeyRound size={18} color="#64748B" />
                  <Text className="text-base font-medium text-foreground ml-3">
                    Đổi mật khẩu tài khoản
                  </Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

              {/* Mã mời gia đình của tôi */}
              <TouchableOpacity
                className="flex-row items-center justify-between py-3 border-b border-border/50"
                onPress={() => router.push('/admin' as any)}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <QrCode size={18} color="#64748B" />
                  <Text className="text-base font-medium text-foreground ml-3">
                    Mã mời kết nối người nhà
                  </Text>
                </View>
                <Badge variant="outline" label="4 thành viên" />
              </TouchableOpacity>

              {/* Cài đặt ứng dụng & Khoá vân tay */}
              <TouchableOpacity
                className="flex-row items-center justify-between py-3 border-b border-border/50"
                onPress={() => router.push('/settings' as any)}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <Settings size={18} color="#0D9488" />
                  <Text className="text-base font-medium text-foreground ml-3">
                    Cài đặt bảo vệ & Vân tay
                  </Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

              {/* Bảo mật RLS */}
              <View className="flex-row items-center py-2">
                <Shield size={18} color="#0D9488" />
                <Text className="text-xs text-muted-foreground ml-3 flex-1">
                  Dữ liệu được bảo vệ bằng Row Level Security (RLS) của Supabase.
                </Text>
              </View>
            </Card>

            {/* Nút Đăng xuất */}
            <Button
              variant="outline"
              size="lg"
              className="w-full h-13 rounded-2xl border-destructive/40 bg-destructive/5"
              onPress={handleLogout}
            >
              <View className="flex-row items-center justify-center">
                <LogOut size={18} color="#EF4444" />
                <Text className="text-destructive font-semibold text-base ml-2">
                  Đăng xuất tài khoản
                </Text>
              </View>
            </Button>
          </View>
        ) : (
          /* TRƯỜNG HỢP: CHƯA ĐĂNG NHẬP / MÀN HÌNH ĐĂNG NHẬP TẠI CHỖ */
          <View>
            <Card className="p-5 border-border/80 mb-5">
              <View className="items-center mb-5">
                <View className="h-16 w-16 rounded-3xl bg-primary/10 items-center justify-center mb-3">
                  <Lock size={30} color="#0D9488" />
                </View>
                <Text className="text-xl font-bold text-foreground">
                  Đăng nhập tài khoản
                </Text>
                <Text className="text-xs text-muted-foreground text-center mt-1 px-2">
                  Dành riêng cho các thành viên trong gia đình
                </Text>
              </View>

              {/* Cách 1: Đăng nhập bằng Mã mời 6 số (tiện cho bố mẹ) */}
              <Text className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                Cách 1: Nhập mã gia đình (1-chạm)
              </Text>
              <View className="flex-row space-x-2 mb-4">
                <Input
                  value={inviteCodeInput}
                  onChangeText={setInviteCodeInput}
                  placeholder="Ví dụ: GD-8899"
                  className="flex-1 uppercase font-bold text-center tracking-widest"
                />
                <Button
                  variant="default"
                  className="bg-primary px-4 rounded-2xl"
                  onPress={handleLoginByInviteCode}
                >
                  <Text className="text-white font-semibold">Kết nối</Text>
                </Button>
              </View>

              <View className="h-[1px] bg-border/60 my-3" />

              {/* Cách 2: Đăng nhập bằng Email/Mật khẩu */}
              <Text className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                Cách 2: Tài khoản quản trị viên
              </Text>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 rounded-2xl mb-2"
                onPress={() => router.push('/(auth)/login')}
              >
                <Text className="text-foreground font-semibold text-sm">
                  Đăng nhập bằng Email & Mật khẩu
                </Text>
              </Button>

              <Text className="text-[11px] text-muted-foreground text-center mt-2 leading-relaxed">
                App gia đình riêng tư: Tài khoản được cấp bởi Quản trị viên (Chủ hộ). Không hỗ trợ đăng ký tự do để bảo mật thông tin sức khỏe.
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
