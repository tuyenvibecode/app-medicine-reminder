// Mục đích: Màn hình tài khoản, đồng bộ phiên đăng nhập và lối vào đơn thuốc, cài đặt, quản trị gia đình.
// app/(tabs)/account.tsx
// Màn hình "Tài khoản", Lưu trữ Đơn thuốc Bác sĩ & Trung tâm Quản trị Gia đình

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppAlert as Alert } from '@/components/ui/app-dialog';
import {
  User,
  Shield,
  Users,
  KeyRound,
  LogOut,
  LogIn,
  ChevronRight,
  QrCode,
  Settings,
  FileText,
  BellRing,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const router = useRouter();
  const { doctorPrescriptions, omronReadings, reminderSettings } = useAppStore();

  // Trạng thái phiên đăng nhập thật từ Supabase Auth (mặc định dùng chế độ cục bộ khi chưa kết nối)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) return;

    const applySessionUser = (email?: string | null, fullName?: string) => {
      if (email) {
        setIsLoggedIn(true);
        setUserEmail(email);
        setDisplayName(fullName || email.split('@')[0] || 'Thành viên gia đình');
      } else {
        setIsLoggedIn(false);
        setUserEmail('');
        setDisplayName('');
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      applySessionUser(user?.email, user?.user_metadata?.full_name as string | undefined);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      applySessionUser(user?.email, user?.user_metadata?.full_name as string | undefined);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Xử lý đăng xuất và xoá sạch token trong SecureStore
  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
          try {
            await supabase.auth.signOut();
          } catch {}
          setIsLoggedIn(false);
          setUserEmail('');
          setDisplayName('');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 110 }}
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

        <View>
          {/* 1. Thẻ trạng thái tài khoản (đồng bộ Supabase hoặc chế độ lưu cục bộ trên máy) */}
          <Card className="mb-5 p-5 border-border/80">
            <View className="flex-row items-center">
              {/* Avatar */}
              <View className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/30 items-center justify-center">
                <User size={32} color="#0D9488" strokeWidth={2} />
              </View>

              {/* Thông tin */}
              <View className="ml-4 flex-1">
                {isLoggedIn ? (
                  <>
                    <View className="flex-row items-center flex-wrap gap-1.5">
                      <Text className="text-lg font-bold text-foreground">
                        {displayName}
                      </Text>
                      <Badge variant="default" label="Đã đồng bộ" />
                    </View>
                    <Text className="text-sm text-muted-foreground mt-0.5">
                      {userEmail}
                    </Text>
                    <Text className="text-xs text-primary font-medium mt-1">
                      Tài khoản gia đình
                    </Text>
                  </>
                ) : (
                  <>
                    <View className="flex-row items-center flex-wrap gap-1.5">
                      <Text className="text-lg font-bold text-foreground">
                        Dùng trên thiết bị này
                      </Text>
                      <Badge variant="secondary" label="Cục bộ" />
                    </View>
                    <Text className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Dữ liệu thuốc và lịch nhắc đang lưu riêng tư trên máy. Đăng nhập để đồng bộ cùng gia đình.
                    </Text>
                  </>
                )}
              </View>
            </View>

            {!isLoggedIn && (
              <Button
                variant="default"
                size="default"
                className="bg-primary w-full h-11 rounded-2xl mt-4"
                onPress={() => router.push('/(auth)/login')}
              >
                <View className="flex-row items-center justify-center">
                  <LogIn size={16} color="#FFFFFF" />
                  <Text className="text-white font-semibold text-sm ml-2">
                    Đăng nhập / Kết nối gia đình
                  </Text>
                </View>
              </Button>
            )}
          </Card>

            {/* 2. QUẢN LÝ SỨC KHOẺ (Đo máy Omron chuẩn Bộ Y tế & Hồ sơ khám nhiều ảnh) */}
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
              Quản lý Sức khoẻ & Đơn thuốc
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/health' as any)}
              activeOpacity={0.75}
              className="mb-5"
            >
              <Card className="p-4 border-primary/30 bg-card">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                      <FileText size={22} color="#0D9488" strokeWidth={2} />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center flex-wrap gap-1.5">
                        <Text className="text-base font-bold text-foreground">
                          Sức khoẻ & Đơn thuốc
                        </Text>
                        <Badge
                          variant="default"
                          label={
                            omronReadings.length + doctorPrescriptions.length > 0
                              ? `${omronReadings.length} đo HA • ${doctorPrescriptions.length} đơn`
                              : 'Omron & Khám bệnh'
                          }
                        />
                      </View>
                      <Text className="text-xs text-muted-foreground mt-1" numberOfLines={2}>
                        Đo huyết áp Omron chuẩn Bộ Y tế, lưu nhiều ảnh giấy khám & so sánh thay đổi thuốc
                      </Text>
                    </View>
                  </View>
                  <View className="w-6 items-end justify-center">
                    <ChevronRight size={20} color="#0D9488" />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>

            {/* 3. TRUNG TÂM QUẢN TRỊ GIA ĐÌNH */}
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
              Trung tâm Quản trị
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/admin' as any)}
              activeOpacity={0.75}
              className="mb-5"
            >
              <Card className="p-4 border-border/80 bg-card">
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

            {/* 4. BẢO MẬT & CẤU HÌNH (Nhạc chuông, giờ nhắc thuốc, vân tay) */}
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
              Bảo mật & Cấu hình
            </Text>
            <Card className="mb-5 p-4 border-border/80">
              {/* Cấu hình thời gian nhắc nhở & Nhạc chuông báo */}
              <TouchableOpacity
                className="flex-row items-center justify-between py-3 border-b border-border/50"
                onPress={() => router.push('/settings' as any)}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <BellRing size={19} color="#0D9488" />
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      Cấu hình giờ nhắc & Nhạc chuông
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                      {reminderSettings.ringtoneName} • Sáng {reminderSettings.morningTime}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#0D9488" />
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

              {/* Mã mời gia đình của tôi - Bố cục 2 dòng thoáng gọn kèm mũi tên điều hướng */}
              <TouchableOpacity
                className="flex-row items-center justify-between py-3 border-b border-border/50"
                onPress={() => router.push('/admin' as any)}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <QrCode size={18} color="#0D9488" />
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-medium text-foreground">
                      Mã mời kết nối người nhà
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-0.5">
                      Quản lý thành viên & mã mời gia đình
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>

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

              {/* Bảo mật RLS */}
              <View className="flex-row items-center pt-3 pb-1">
                <Shield size={18} color="#0D9488" />
                <Text className="text-xs text-muted-foreground ml-3 flex-1">
                  Dữ liệu được bảo vệ bằng Row Level Security (RLS) của Supabase.
                </Text>
              </View>
            </Card>

            {/* Nút Đăng xuất (chỉ hiện khi đã đăng nhập tài khoản đám mây) */}
            {isLoggedIn && (
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
            )}
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}
