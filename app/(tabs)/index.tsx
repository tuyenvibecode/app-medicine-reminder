// app/(tabs)/index.tsx
// Màn hình chính "Hôm nay"
// Theo sát UI-PROMPT.md: Lời chào, thanh tiến độ liều trong ngày, nhóm liều Sáng/Trưa/Chiều/Tối

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sun, Sunset, Moon, Plus, Sparkles, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { DoseCard } from '@/components/DoseCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { DoseTimelineItem } from '@/types';

// Dữ liệu mẫu khởi đầu (để UI hoạt động mượt mà ngay cả khi chưa nối Supabase)
const INITIAL_DOSES: DoseTimelineItem[] = [
  {
    id: '1',
    scheduleId: 's1',
    medicationId: 'm1',
    medicationName: 'Amlodipine (Huyết áp)',
    dosage: '1 viên (5mg) - Sau ăn',
    scheduledTime: '07:30',
    timeGroup: 'morning',
    status: 'taken',
    stock: 24,
    lowStockThreshold: 5,
  },
  {
    id: '2',
    scheduleId: 's2',
    medicationId: 'm2',
    medicationName: 'Omega 3 Dầu cá',
    dosage: '1 viên nang mềm - Sau ăn',
    scheduledTime: '08:00',
    timeGroup: 'morning',
    status: 'upcoming',
    stock: 12,
    lowStockThreshold: 7,
  },
  {
    id: '3',
    scheduleId: 's3',
    medicationId: 'm3',
    medicationName: 'Vitamin C 500mg',
    dosage: '1 viên - Sau bữa trưa',
    scheduledTime: '12:30',
    timeGroup: 'noon',
    status: 'upcoming',
    stock: 4,
    lowStockThreshold: 5, // Cảnh báo sắp hết
  },
  {
    id: '4',
    scheduleId: 's4',
    medicationId: 'm4',
    medicationName: 'Magnesium B6',
    dosage: '1 viên - Trước khi ngủ 30 phút',
    scheduledTime: '21:00',
    timeGroup: 'evening',
    status: 'upcoming',
    stock: 30,
    lowStockThreshold: 6,
  },
];

export default function TodayScreen() {
  const router = useRouter();
  const [doses, setDoses] = useState<DoseTimelineItem[]>(INITIAL_DOSES);

  // Xử lý bấm "Đã uống" 1-chạm
  const handleTakeDose = (item: DoseTimelineItem) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setDoses((prev) =>
      prev.map((d) => (d.id === item.id ? { ...d, status: 'taken' } : d))
    );
  };

  // Xử lý hoãn nhắc sau 15 phút
  const handleSnoozeDose = (item: DoseTimelineItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    Alert.alert(
      'Đã hẹn nhắc lại',
      `Ứng dụng sẽ báo lại sau 15 phút cho liều "${item.medicationName}".`
    );
  };

  const takenCount = doses.filter((d) => d.status === 'taken').length;
  const totalCount = doses.length;
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const morningDoses = doses.filter((d) => d.timeGroup === 'morning');
  const noonDoses = doses.filter((d) => d.timeGroup === 'noon');
  const eveningDoses = doses.filter((d) => d.timeGroup === 'evening');

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Lời chào và nút Thêm thuốc nhanh */}
        <View className="flex-row items-center justify-between pb-3">
          <View>
            <Text className="text-xs font-semibold text-primary uppercase tracking-wider">
              Hôm nay
            </Text>
            <Text className="text-2xl font-bold text-foreground tracking-tight">
              Lịch uống thuốc
            </Text>
          </View>

          <Button
            variant="default"
            size="sm"
            className="flex-row items-center bg-primary px-3.5 rounded-full"
            onPress={() => router.push('/medication/add')}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text className="text-white font-semibold text-sm ml-1">Thêm</Text>
          </Button>
        </View>

        {/* Thẻ tiến độ trong ngày */}
        <Card className="mb-5 bg-card border-border/80 p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-medium text-muted-foreground">
                Tiến độ hoàn thành
              </Text>
              <Text className="text-xl font-bold text-foreground mt-0.5">
                {takenCount}/{totalCount} liều hôm nay
              </Text>
            </View>

            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 border border-primary/25">
              <Text className="text-base font-bold text-primary">
                {progressPercent}%
              </Text>
            </View>
          </View>

          {/* Thanh tiến độ bo tròn */}
          <View className="w-full h-2.5 bg-muted rounded-full mt-3 overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </View>

          {progressPercent === 100 && (
            <View className="flex-row items-center mt-2.5">
              <CheckCircle2 size={16} color="#10B981" />
              <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-1.5">
                Tuyệt vời! Bạn đã uống đủ tất cả liều thuốc hôm nay.
              </Text>
            </View>
          )}
        </Card>

        {/* 1. Nhóm buổi Sáng */}
        {morningDoses.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center mb-2.5">
              <Sun size={18} color="#0D9488" strokeWidth={2.2} />
              <Text className="text-base font-bold text-foreground ml-2">
                Buổi sáng
              </Text>
            </View>
            {morningDoses.map((dose) => (
              <DoseCard
                key={dose.id}
                item={dose}
                onTake={handleTakeDose}
                onSnooze={handleSnoozeDose}
              />
            ))}
          </View>
        )}

        {/* 2. Nhóm buổi Trưa */}
        {noonDoses.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center mb-2.5">
              <Sunset size={18} color="#F59E0B" strokeWidth={2.2} />
              <Text className="text-base font-bold text-foreground ml-2">
                Buổi trưa
              </Text>
            </View>
            {noonDoses.map((dose) => (
              <DoseCard
                key={dose.id}
                item={dose}
                onTake={handleTakeDose}
                onSnooze={handleSnoozeDose}
              />
            ))}
          </View>
        )}

        {/* 3. Nhóm buổi Tối */}
        {eveningDoses.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center mb-2.5">
              <Moon size={18} color="#6366F1" strokeWidth={2.2} />
              <Text className="text-base font-bold text-foreground ml-2">
                Buổi tối
              </Text>
            </View>
            {eveningDoses.map((dose) => (
              <DoseCard
                key={dose.id}
                item={dose}
                onTake={handleTakeDose}
                onSnooze={handleSnoozeDose}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
