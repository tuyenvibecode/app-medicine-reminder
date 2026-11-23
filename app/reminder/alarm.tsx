// Mục đích: Màn hình báo thức Mèo nhắc giờ uống thuốc kèm chuông reo, nút Đã uống và màn chúc mừng.
// app/reminder/alarm.tsx

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  BellRing,
  CheckCircle2,
  Clock,
  Pill,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/context/AppContext';
import { scheduleSnoozeNotification } from '@/lib/notifications';

// Hình Mèo nhắc giờ uống thuốc (copy từ img/Mèo Nhắc Giờ Uống Thuốc.png)
const CAT_REMINDER_IMAGE = require('../../assets/images/cat-reminder.png');
// Hình Mèo chúc mừng tạm thời (khi thiết kế xong chỉ cần thay đúng file assets/images/cat-celebrate.jpg)
const CAT_CELEBRATE_IMAGE = require('../../assets/images/cat-celebrate.jpg');

type AlarmPhase = 'ringing' | 'celebrating';

export default function ReminderAlarmScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const params = useLocalSearchParams<{
    doseId?: string;
    medicationName?: string;
    dosage?: string;
    scheduledTime?: string;
    imageUrl?: string;
  }>();

  const { doses, medications, reminderSettings, takeDose, snoozeDose } = useAppStore();

  const [phase, setPhase] = useState<AlarmPhase>('ringing');
  const [isMuted, setIsMuted] = useState(false);

  // Tìm liều thuốc tương ứng trong lịch hôm nay (ưu tiên theo doseId, dự phòng theo tên thuốc)
  const matchedDose = useMemo(() => {
    if (params.doseId) {
      const byId = doses.find((d) => d.id === params.doseId);
      if (byId) return byId;
    }
    if (params.medicationName) {
      return doses.find(
        (d) =>
          d.medicationName === params.medicationName &&
          (!params.scheduledTime || d.scheduledTime === params.scheduledTime)
      ) || doses.find((d) => d.medicationName === params.medicationName);
    }
    return undefined;
  }, [doses, params.doseId, params.medicationName, params.scheduledTime]);

  const medicationName =
    params.medicationName || matchedDose?.medicationName || 'Liều thuốc theo lịch';
  const dosage = params.dosage || matchedDose?.dosage || 'Uống theo hướng dẫn của dược sĩ';
  const scheduledTime =
    params.scheduledTime ||
    matchedDose?.scheduledTime ||
    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // Lấy ảnh viên thuốc từ params -> dose -> tủ thuốc để luôn hiển thị đúng ảnh đã thêm
  const pillImageUrl = useMemo(() => {
    if (params.imageUrl && params.imageUrl.trim().length > 0) return params.imageUrl;
    if (matchedDose?.image) return matchedDose.image;
    const med = medications.find((m) => m.name === medicationName);
    return med?.image || null;
  }, [params.imageUrl, matchedDose, medications, medicationName]);

  // Chọn đúng file nhạc chuông theo cấu hình của người dùng
  const ringtoneSource = useMemo(() => {
    if (reminderSettings.ringtoneId === 'gentle') {
      return require('../../assets/sounds/reminder_gentle.wav');
    }
    if (reminderSettings.ringtoneId === 'loud_alarm') {
      return require('../../assets/sounds/reminder_loud.wav');
    }
    return require('../../assets/sounds/reminder_standard.wav');
  }, [reminderSettings.ringtoneId]);

  const alarmPlayer = useAudioPlayer(ringtoneSource);

  // Hiệu ứng lắc nhẹ biểu tượng chuông báo thức và bật nảy màn chúc mừng
  const bellRotation = useSharedValue(0);
  const celebrateScale = useSharedValue(0.85);

  const bellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotation.get()}deg` }],
  }));

  const celebrateAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrateScale.get() }],
  }));

  // Dừng chuông và rung ngay lập tức
  const stopAlarmAudioAndVibration = useCallback(() => {
    try {
      alarmPlayer.pause();
    } catch {}
    try {
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
    } catch {}
  }, [alarmPlayer]);

  // Bắt đầu phát chuông lặp lại + rung khi màn hình báo thức đang reo
  useEffect(() => {
    if (phase !== 'ringing') {
      stopAlarmAudioAndVibration();
      return;
    }

    let isActive = true;
    let replayTimer: ReturnType<typeof setInterval> | null = null;

    const playOnce = () => {
      try {
        alarmPlayer.seekTo(0);
        alarmPlayer.play();
      } catch {}
    };

    const startAlarm = async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
      } catch {}

      if (!isActive) return;

      // Phát nhạc chuông lặp lại mỗi 2.8 giây (trừ chế độ Chỉ rung hoặc người dùng bấm Tắt tiếng)
      if (!isMuted && reminderSettings.ringtoneId !== 'vibrate_only') {
        playOnce();
        replayTimer = setInterval(playOnce, 2800);
      } else {
        try {
          alarmPlayer.pause();
        } catch {}
      }

      // Rung nhịp báo thức trên điện thoại
      if (Platform.OS !== 'web') {
        try {
          const pattern =
            reminderSettings.ringtoneId === 'loud_alarm'
              ? [0, 500, 250, 500, 250, 500, 800]
              : reminderSettings.ringtoneId === 'gentle'
                ? [0, 200, 1200]
                : [0, 350, 250, 350, 1000];
          Vibration.vibrate(pattern, true);
        } catch {}
      }
    };

    startAlarm();

    if (!reducedMotion) {
      bellRotation.set(
        withRepeat(
          withSequence(
            withTiming(-14, { duration: 120 }),
            withTiming(14, { duration: 120 }),
            withTiming(-10, { duration: 100 }),
            withTiming(10, { duration: 100 }),
            withTiming(0, { duration: 120 }),
            withTiming(0, { duration: 600 })
          ),
          -1,
          false
        )
      );
    }

    return () => {
      isActive = false;
      if (replayTimer) clearInterval(replayTimer);
      stopAlarmAudioAndVibration();
    };
  }, [
    phase,
    isMuted,
    reminderSettings.ringtoneId,
    alarmPlayer,
    bellRotation,
    reducedMotion,
    stopAlarmAudioAndVibration,
  ]);

  // Xử lý bấm nút "Đã uống" -> Tắt chuông, lưu đã uống và hiện màn Mèo chúc mừng
  const handleMarkTaken = () => {
    stopAlarmAudioAndVibration();
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    if (matchedDose && matchedDose.status !== 'taken') {
      takeDose(matchedDose);
    }

    setPhase('celebrating');
    celebrateScale.set(reducedMotion ? 1 : withSpring(1, { damping: 12, stiffness: 140 }));
  };

  // Xử lý bấm "Nhắc lại sau 15 phút"
  const handleSnooze = async () => {
    stopAlarmAudioAndVibration();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (matchedDose) {
      snoozeDose(matchedDose);
    } else {
      await scheduleSnoozeNotification(
        medicationName,
        dosage,
        reminderSettings.hideDetailsOnLock,
        reminderSettings.ringtoneId,
        params.doseId,
        scheduledTime,
        pillImageUrl
      );
    }

    router.back();
  };

  // Đóng màn hình báo thức
  const handleClose = () => {
    stopAlarmAudioAndVibration();
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Thanh công cụ trên cùng: Tắt tiếng tạm & Đóng */}
        <View className="flex-row items-center justify-between">
          {phase === 'ringing' ? (
            <TouchableOpacity
              onPress={() => setIsMuted((prev) => !prev)}
              accessibilityLabel={isMuted ? 'Bật lại tiếng chuông' : 'Tắt tạm tiếng chuông'}
              className="h-12 px-4 rounded-full bg-muted/80 flex-row items-center justify-center"
            >
              {isMuted ? (
                <VolumeX size={20} color="#64748B" />
              ) : (
                <Volume2 size={20} color="#0D9488" />
              )}
              <Text className="text-sm font-semibold text-foreground ml-2">
                {isMuted ? 'Đang tắt tiếng' : 'Đang đổ chuông'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="h-12 px-4 rounded-full bg-primary/15 flex-row items-center">
              <Sparkles size={18} color="#0D9488" />
              <Text className="text-sm font-bold text-primary ml-1.5">Hoàn thành cữ thuốc</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleClose}
            accessibilityLabel="Đóng màn hình nhắc thuốc"
            className="h-12 w-12 rounded-full bg-muted/80 items-center justify-center"
          >
            <X size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {phase === 'ringing' ? (
          /* ================= TRẠNG THÁI 1: ĐẾN GIỜ UỐNG THUỐC ================= */
          <View className="items-center my-4">
            {/* Nhãn giờ báo thức kèm icon chuông rung */}
            <View className="flex-row items-center bg-primary/12 border border-primary/30 px-4 py-2 rounded-full mb-4">
              <Animated.View style={bellAnimatedStyle}>
                <BellRing size={20} color="#0D9488" />
              </Animated.View>
              <Text className="text-base font-extrabold text-primary ml-2">
                {scheduledTime} • ĐẾN GIỜ UỐNG THUỐC
              </Text>
            </View>

            {/* Hình Mèo Nhắc Giờ Uống Thuốc (không khung viền để hoà tự nhiên với nền) */}
            <View
              style={{
                width: 260,
                height: 260,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={CAT_REMINDER_IMAGE}
                style={{ width: 256, height: 256 }}
                contentFit="contain"
                accessibilityLabel="Hình mèo nhắc đến giờ uống thuốc"
              />
            </View>

            {/* Thông tin thuốc cần uống */}
            <Card className="w-full mt-4 p-4 border-border/80">
              <View className="flex-row items-center">
                {pillImageUrl ? (
                  <Image
                    source={{ uri: pillImageUrl }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 14,
                      backgroundColor: '#F8FAFC',
                    }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center">
                    <Pill size={28} color="#0D9488" />
                  </View>
                )}

                <View className="ml-3.5 flex-1">
                  <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Thuốc cần uống lúc {scheduledTime}
                  </Text>
                  <Text className="text-[15px] leading-snug font-bold text-foreground mt-0.5">
                    {medicationName}
                  </Text>
                  <Text className="text-sm text-muted-foreground mt-1">
                    {dosage}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        ) : (
          /* ================= TRẠNG THÁI 2: MÈO CHÚC MỪNG ĐÃ UỐNG ================= */
          <Animated.View style={celebrateAnimatedStyle} className="items-center my-4">
            {/* Hình Mèo chúc mừng (không khung viền, dễ thay file assets/images/cat-celebrate.jpg sau) */}
            <View
              style={{
                width: 260,
                height: 260,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={CAT_CELEBRATE_IMAGE}
                style={{ width: 252, height: 252, borderRadius: 24 }}
                contentFit="contain"
                accessibilityLabel="Hình mèo chúc mừng đã uống thuốc"
              />
            </View>

            <Text className="text-2xl font-extrabold text-foreground text-center mt-4">
              Tuyệt vời! Đã uống thuốc rồi
            </Text>
            <Text className="text-sm text-muted-foreground text-center mt-2 leading-relaxed px-2">
              Bạn vừa hoàn thành cữ{' '}
              <Text className="font-bold text-foreground">{medicationName}</Text>. Uống đúng giờ
              giúp sức khoẻ luôn ổn định!
            </Text>

            {/* Khung xác nhận giờ đã uống sạch đẹp, không bị vạch trắng bên trong */}
            <View
              style={{
                width: '100%',
                marginTop: 20,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 16,
                backgroundColor: 'rgba(13, 148, 136, 0.10)',
                borderWidth: 1,
                borderColor: 'rgba(13, 148, 136, 0.25)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} color="#0D9488" />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: '#0D9488',
                  marginLeft: 8,
                }}
              >
                Đã ghi nhận uống lúc{' '}
                {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Khu vực nút hành động to rõ, dễ bấm cho cả người lớn tuổi */}
        {phase === 'ringing' ? (
          <View className="gap-3">
            <Button
              variant="default"
              className="w-full h-14 rounded-2xl bg-primary"
              onPress={handleMarkTaken}
            >
              <View className="flex-row items-center justify-center">
                <CheckCircle2 size={22} color="#FFFFFF" />
                <Text className="text-lg font-extrabold text-white ml-2">Đã uống thuốc</Text>
              </View>
            </Button>

            <Button
              variant="outline"
              className="w-full h-13 rounded-2xl border-border"
              onPress={handleSnooze}
            >
              <View className="flex-row items-center justify-center">
                <Clock size={18} color="#64748B" />
                <Text className="text-base font-semibold text-foreground ml-2">
                  Nhắc lại sau 15 phút
                </Text>
              </View>
            </Button>
          </View>
        ) : (
          <Button
            variant="default"
            className="w-full h-14 rounded-2xl bg-primary"
            onPress={handleClose}
          >
            <Text className="text-lg font-extrabold text-white">Xong, quay lại ứng dụng</Text>
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
