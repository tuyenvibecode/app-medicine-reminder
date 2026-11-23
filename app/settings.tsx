// app/settings.tsx
// Màn hình Cấu hình Thời gian nhắc uống thuốc, Nhạc chuông báo thức & Bảo mật vân tay
// Đặt ở cấp Stack gốc (app/settings.tsx) để không bị xung đột route với nhóm (tabs) và tự động ẩn Bottom Bar.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
  Modal,
  Platform,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  Bell,
  Fingerprint,
  EyeOff,
  Clock,
  Volume2,
  Check,
  Sun,
  Sunset,
  CloudSun,
  Moon,
  X,
  ShieldAlert,
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/context/AppContext';
import {
  setupNotificationChannels,
  sendTestReminderNotification,
} from '@/lib/notifications';
import {
  loadSecurityPreferences,
  saveBiometricsEnabled,
  savePrivacyShieldEnabled,
} from '@/lib/securityConfig';
import { AI_MODEL_FALLBACK_CHAIN } from '@/services/aiPrescriptionService';
import { Input } from '@/components/ui/input';
import type { ReminderSettings } from '@/types';

const RINGTONE_OPTIONS: {
  id: ReminderSettings['ringtoneId'];
  name: string;
  desc: string;
}[] = [
  {
    id: 'default',
    name: 'Chuông báo tiêu chuẩn (Rõ ràng)',
    desc: 'Âm thanh mặc định kết hợp rung 2 nhịp rõ ràng',
  },
  {
    id: 'gentle',
    name: 'Âm báo nhẹ nhàng (Dịu tai)',
    desc: 'Chuông nhẹ kèm rung êm, tránh giật mình',
  },
  {
    id: 'loud_alarm',
    name: 'Chuông báo thức lớn (Cho ông bà)',
    desc: 'Ưu tiên âm lượng cao nhất và rung liên tục',
  },
  {
    id: 'vibrate_only',
    name: 'Chỉ rung (Im lặng)',
    desc: 'Chỉ rung thiết bị, không phát tiếng chuông',
  },
];

type TimeSlotKey = 'morningTime' | 'noonTime' | 'afternoonTime' | 'eveningTime';

export default function SettingsScreen() {
  const router = useRouter();
  const { reminderSettings, updateReminderSettings } = useAppStore();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [privacyShieldEnabled, setPrivacyShieldEnabled] = useState(true);
  const [isTestingSound, setIsTestingSound] = useState(false);

  // Tải trạng thái bảo mật và đảm bảo 4 kênh thông báo Android đã được khởi tạo
  useEffect(() => {
    setupNotificationChannels().catch(() => {});
    loadSecurityPreferences().then((prefs) => {
      setBiometricsEnabled(prefs.biometricsEnabled);
      setPrivacyShieldEnabled(prefs.privacyShieldEnabled);
    });
  }, []);

  // Modal chỉnh giờ cho từng buổi
  const [editingSlot, setEditingSlot] = useState<{
    key: TimeSlotKey;
    label: string;
  } | null>(null);
  const [tempHour, setTempHour] = useState(7);
  const [tempMinute, setTempMinute] = useState(30);

  const openEditTimeModal = (key: TimeSlotKey, label: string, currentVal: string) => {
    const [hStr, mStr] = currentVal.split(':');
    setTempHour(parseInt(hStr || '7', 10));
    setTempMinute(parseInt(mStr || '30', 10));
    setEditingSlot({ key, label });
  };

  const handleSaveTimeSlot = () => {
    if (!editingSlot) return;
    const formatted = `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
    const slotLabel = editingSlot.label;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    updateReminderSettings({ [editingSlot.key]: formatted });
    setEditingSlot(null);
    Alert.alert(
      'Đã cập nhật giờ nhắc',
      `Khung giờ ${slotLabel} đã đổi sang ${formatted}. Lịch uống thuốc hôm nay và báo thức Android đã được tự động đồng bộ lại.`
    );
  };

  const handleSelectRingtone = (opt: (typeof RINGTONE_OPTIONS)[number]) => {
    // Rung phản hồi khác nhau theo từng kiểu chuông để người dùng cảm nhận ngay
    try {
      if (Platform.OS !== 'web') {
        if (opt.id === 'loud_alarm') {
          Vibration.vibrate([0, 300, 120, 300]);
        } else if (opt.id === 'gentle') {
          Vibration.vibrate(100);
        } else {
          Vibration.vibrate(180);
        }
      } else {
        Haptics.selectionAsync();
      }
    } catch {}
    updateReminderSettings({
      ringtoneId: opt.id,
      ringtoneName: opt.name,
    });
  };

  // Phát thử chuông báo & thông báo nhắc thuốc thật theo đúng kênh Android đã chọn
  const handleTestRingtone = async () => {
    if (isTestingSound) return;
    setIsTestingSound(true);
    try {
      const sent = await sendTestReminderNotification(
        reminderSettings.ringtoneId,
        reminderSettings.ringtoneName
      );
      if (sent) {
        Alert.alert(
          'Đang phát thông báo thử (sau 1 giây)',
          `Kênh áp dụng: "${reminderSettings.ringtoneName}".\n\nNếu máy đang để chế độ Im lặng/Không làm phiền, hãy bật âm lượng chuông hoặc kiểm tra quyền Thông báo trong Cài đặt Android.`
        );
      } else {
        Alert.alert(
          'Chưa cấp quyền thông báo',
          'Ứng dụng cần quyền Thông báo để phát chuông nhắc thuốc. Anh hãy vào Cài đặt điện thoại -> Ứng dụng -> Nhắc nhở uống thuốc -> Thông báo và bật cho phép.'
        );
      }
    } finally {
      setIsTestingSound(false);
    }
  };

  // Xử lý bật/tắt sinh trắc học và lưu vĩnh viễn vào SecureStore
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
        await saveBiometricsEnabled(true);
        Alert.alert('Thành công', 'Đã bật khoá bảo vệ bằng sinh trắc học mỗi khi mở app.');
      }
    } else {
      setBiometricsEnabled(false);
      await saveBiometricsEnabled(false);
    }
  };

  // Xử lý bật/tắt màn hình che đa nhiệm (Recent Apps Privacy Shield)
  const handleTogglePrivacyShield = async (value: boolean) => {
    setPrivacyShieldEnabled(value);
    await savePrivacyShieldEnabled(value);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header có nút Quay lại */}
        <View className="flex-row items-center pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 rounded-full bg-muted/60 items-center justify-center mr-3"
            accessibilityLabel="Quay lại"
          >
            <ArrowLeft size={20} color="#64748B" />
          </TouchableOpacity>
          <View>
            <Text className="text-xs font-semibold text-primary uppercase tracking-wider">
              Cấu hình hệ thống
            </Text>
            <Text className="text-2xl font-bold text-foreground tracking-tight">
              Giờ nhắc & Nhạc chuông
            </Text>
          </View>
        </View>

        {/* 1. CẤU HÌNH KHUNG GIỜ UỐNG THUỐC MẶC ĐỊNH */}
        <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
          Khung giờ nhắc thuốc mặc định
        </Text>
        <Card className="mb-5 p-4 border-border/80">
          <Text className="text-xs text-muted-foreground mb-3">
            Chạm vào từng buổi để đổi giờ nhắc chuẩn cho gia đình (tự động cập nhật lịch & báo thức):
          </Text>

          <View className="flex-row flex-wrap gap-2.5">
            {/* Buổi sáng */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                openEditTimeModal('morningTime', 'Buổi sáng', reminderSettings.morningTime)
              }
              style={{
                width: '48%',
                padding: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#CCFBF1',
                backgroundColor: 'rgba(13, 148, 136, 0.06)',
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Sun size={16} color="#0D9488" />
                  <Text className="text-xs font-semibold text-muted-foreground ml-1.5">
                    Buổi sáng
                  </Text>
                </View>
                <Clock size={13} color="#0D9488" />
              </View>
              <Text className="text-xl font-bold text-foreground mt-1.5">
                {reminderSettings.morningTime}
              </Text>
            </TouchableOpacity>

            {/* Buổi trưa */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                openEditTimeModal('noonTime', 'Buổi trưa', reminderSettings.noonTime)
              }
              style={{
                width: '48%',
                padding: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#FEF3C7',
                backgroundColor: 'rgba(245, 158, 11, 0.06)',
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Sunset size={16} color="#F59E0B" />
                  <Text className="text-xs font-semibold text-muted-foreground ml-1.5">
                    Buổi trưa
                  </Text>
                </View>
                <Clock size={13} color="#F59E0B" />
              </View>
              <Text className="text-xl font-bold text-foreground mt-1.5">
                {reminderSettings.noonTime}
              </Text>
            </TouchableOpacity>

            {/* Buổi chiều */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                openEditTimeModal('afternoonTime', 'Buổi chiều', reminderSettings.afternoonTime)
              }
              style={{
                width: '48%',
                padding: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#FFEDD5',
                backgroundColor: 'rgba(234, 88, 12, 0.06)',
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <CloudSun size={16} color="#EA580C" />
                  <Text className="text-xs font-semibold text-muted-foreground ml-1.5">
                    Buổi chiều
                  </Text>
                </View>
                <Clock size={13} color="#EA580C" />
              </View>
              <Text className="text-xl font-bold text-foreground mt-1.5">
                {reminderSettings.afternoonTime}
              </Text>
            </TouchableOpacity>

            {/* Buổi tối */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                openEditTimeModal('eveningTime', 'Buổi tối', reminderSettings.eveningTime)
              }
              style={{
                width: '48%',
                padding: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E0E7FF',
                backgroundColor: 'rgba(99, 102, 241, 0.06)',
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Moon size={16} color="#6366F1" />
                  <Text className="text-xs font-semibold text-muted-foreground ml-1.5">
                    Buổi tối
                  </Text>
                </View>
                <Clock size={13} color="#6366F1" />
              </View>
              <Text className="text-xl font-bold text-foreground mt-1.5">
                {reminderSettings.eveningTime}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* 2. CẤU HÌNH NHẠC CHUÔNG BÁO THỨC */}
        <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
          Nhạc chuông & Âm báo
        </Text>
        <Card className="mb-5 p-4 border-border/80">
          {RINGTONE_OPTIONS.map((opt, idx) => {
            const isSelected = reminderSettings.ringtoneId === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.75}
                onPress={() => handleSelectRingtone(opt)}
                className={`flex-row items-center justify-between py-3 ${
                  idx < RINGTONE_OPTIONS.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View
                    className={`h-9 w-9 rounded-xl items-center justify-center ${
                      isSelected ? 'bg-primary' : 'bg-muted/70'
                    }`}
                  >
                    <Volume2 size={18} color={isSelected ? '#FFFFFF' : '#64748B'} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      className={`text-sm font-bold ${
                        isSelected ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {opt.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-0.5">
                      {opt.desc}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <View className="h-6 w-6 rounded-full bg-primary/15 items-center justify-center">
                    <Check size={14} color="#0D9488" strokeWidth={2.5} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isTestingSound}
            onPress={handleTestRingtone}
            style={{
              marginTop: 12,
              backgroundColor: 'rgba(13, 148, 136, 0.12)',
              height: 44,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isTestingSound ? 0.6 : 1,
            }}
          >
            <Bell size={16} color="#0D9488" />
            <Text style={{ color: '#0D9488', fontWeight: '700', fontSize: 13, marginLeft: 8 }}>
              {isTestingSound
                ? 'Đang gửi thông báo thử...'
                : 'Nghe / Phát thử thông báo nhắc thuốc'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* 3. Tuỳ chọn Báo thức & Riêng tư */}
        <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
          Quyền riêng tư & Bảo mật
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
                  Vượt qua chế độ Không làm phiền để nhắc đúng giờ
                </Text>
              </View>
            </View>
            <Switch
              value={reminderSettings.highPriorityAlarm}
              onValueChange={(val) => updateReminderSettings({ highPriorityAlarm: val })}
              trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
            />
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-border/50">
            <View className="flex-row items-center flex-1 mr-3">
              <EyeOff size={20} color="#0D9488" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-foreground">
                  Ẩn tên thuốc ở màn hình khoá
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Chỉ hiện &ldquo;Đến giờ uống thuốc&rdquo; để tăng tính riêng tư
                </Text>
              </View>
            </View>
            <Switch
              value={reminderSettings.hideDetailsOnLock}
              onValueChange={(val) => updateReminderSettings({ hideDetailsOnLock: val })}
              trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
            />
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-border/50">
            <View className="flex-row items-center flex-1 mr-3">
              <Fingerprint size={20} color="#0D9488" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-foreground">
                  Khoá bằng vân tay / PIN
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Yêu cầu xác thực mỗi khi mở ứng dụng (Lưu trong Keystore)
                </Text>
              </View>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
            />
          </View>

          <View className="flex-row items-center justify-between pt-3">
            <View className="flex-row items-center flex-1 mr-3">
              <ShieldAlert size={20} color="#0D9488" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-foreground">
                  Che màn hình đa nhiệm (Recent Apps)
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Tự động ẩn thông tin thuốc khi chuyển sang ứng dụng khác
                </Text>
              </View>
            </View>
            <Switch
              value={privacyShieldEnabled}
              onValueChange={handleTogglePrivacyShield}
              trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
            />
          </View>
        </Card>

        {/* 4. CẤU HÌNH AI ĐỌC ĐƠN THUỐC & CHUỖI MODEL DỰ PHÒNG (BACKUP) */}
        <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
          Cấu hình AI & Dự phòng Model (Backup)
        </Text>
        <Card className="mb-5 p-4 border-border/80">
          <Text className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Hệ thống tự động chạy theo{' '}
            <Text className="font-bold text-primary">chuỗi 4 tầng dự phòng</Text>. Nếu model chính
            bị đổi tên hoặc quá tải, app sẽ tự động chuyển sang các model kế tiếp hoặc chế độ
            Offline mà không bao giờ bị lỗi:
          </Text>

          {AI_MODEL_FALLBACK_CHAIN.map((m, idx) => {
            const isSelected = reminderSettings.preferredAiModel === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.75}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  updateReminderSettings({ preferredAiModel: m.id });
                }}
                className={`flex-row items-center justify-between py-2.5 ${
                  idx < AI_MODEL_FALLBACK_CHAIN.length - 1 ? 'border-b border-border/40' : ''
                }`}
              >
                <View className="flex-1 mr-2">
                  <Text
                    className={`text-sm font-bold ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {idx + 1}. {m.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    Mã model: {m.id} • {m.desc}
                  </Text>
                </View>

                {isSelected && (
                  <View className="h-6 w-6 rounded-full bg-primary/15 items-center justify-center">
                    <Check size={14} color="#0D9488" strokeWidth={2.5} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View className="mt-3 pt-3 border-t border-border/50">
            <Text className="text-xs font-semibold text-foreground mb-1.5">
              Hoặc tự nhập mã Model mới (nếu sau này Google ra mắt bản mới):
            </Text>
            <Input
              value={reminderSettings.preferredAiModel}
              onChangeText={(val) => updateReminderSettings({ preferredAiModel: val.trim() })}
              placeholder="gemini-4-hydrogen"
              autoCapitalize="none"
              className="h-10 text-sm font-mono"
            />
          </View>
        </Card>

        {/* 5. Giới thiệu ứng dụng */}
        <Card className="p-4 border-border/60 bg-muted/40 mb-6">
          <View className="flex-row items-center">
            <ShieldCheck size={18} color="#0D9488" />
            <Text className="text-xs font-semibold text-primary ml-1.5">
              Bảo mật sức khoẻ cá nhân
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Dữ liệu nhắc thuốc lưu trên thiết bị của bạn. Thông báo luôn hoạt động ngay cả khi không
            có mạng.
          </Text>
        </Card>
      </ScrollView>

      {/* MODAL CHỈNH GIỜ : PHÚT CHO TỪNG BUỔI */}
      <Modal
        visible={!!editingSlot}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSlot(null)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <Card className="w-full max-w-sm p-5 border-border bg-card">
            <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
              <Text className="text-base font-bold text-foreground">
                Chỉnh giờ nhắc: {editingSlot?.label}
              </Text>
              <TouchableOpacity
                onPress={() => setEditingSlot(null)}
                className="h-8 w-8 rounded-full bg-muted/60 items-center justify-center"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Bộ chỉnh Giờ : Phút to rõ */}
            <View className="flex-row items-center justify-center my-6 gap-4">
              {/* Cột Giờ */}
              <View className="items-center">
                <TouchableOpacity
                  onPress={() => setTempHour((h) => (h + 1) % 24)}
                  className="h-10 w-16 rounded-xl bg-muted/70 items-center justify-center mb-2"
                >
                  <Text className="text-lg font-bold text-foreground">+</Text>
                </TouchableOpacity>
                <View className="h-16 w-20 rounded-2xl bg-primary/10 border border-primary/30 items-center justify-center">
                  <Text className="text-3xl font-extrabold text-primary">
                    {String(tempHour).padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setTempHour((h) => (h - 1 + 24) % 24)}
                  className="h-10 w-16 rounded-xl bg-muted/70 items-center justify-center mt-2"
                >
                  <Text className="text-lg font-bold text-foreground">-</Text>
                </TouchableOpacity>
                <Text className="text-xs text-muted-foreground mt-1">Giờ</Text>
              </View>

              <Text className="text-3xl font-extrabold text-foreground pb-5">:</Text>

              {/* Cột Phút */}
              <View className="items-center">
                <TouchableOpacity
                  onPress={() => setTempMinute((m) => (m + 5) % 60)}
                  className="h-10 w-16 rounded-xl bg-muted/70 items-center justify-center mb-2"
                >
                  <Text className="text-lg font-bold text-foreground">+5</Text>
                </TouchableOpacity>
                <View className="h-16 w-20 rounded-2xl bg-primary/10 border border-primary/30 items-center justify-center">
                  <Text className="text-3xl font-extrabold text-primary">
                    {String(tempMinute).padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setTempMinute((m) => (m - 5 + 60) % 60)}
                  className="h-10 w-16 rounded-xl bg-muted/70 items-center justify-center mt-2"
                >
                  <Text className="text-lg font-bold text-foreground">-5</Text>
                </TouchableOpacity>
                <Text className="text-xs text-muted-foreground mt-1">Phút</Text>
              </View>
            </View>

            {/* Chọn nhanh phút chuẩn */}
            <View className="flex-row gap-2 mb-5">
              {[0, 15, 30, 45].map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setTempMinute(m)}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 10,
                    borderWidth: 1,
                    alignItems: 'center',
                    backgroundColor: tempMinute === m ? '#0D9488' : '#FFFFFF',
                    borderColor: tempMinute === m ? '#0D9488' : '#E2E8F0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: tempMinute === m ? '#FFFFFF' : '#0F172A',
                    }}
                  >
                    :{String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onPress={() => setEditingSlot(null)}
              >
                <Text className="text-sm text-muted-foreground">Huỷ</Text>
              </Button>
              <Button
                variant="default"
                className="flex-1 bg-primary h-11 rounded-xl"
                onPress={handleSaveTimeSlot}
              >
                <Text className="text-sm font-bold text-white">Lưu giờ</Text>
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
