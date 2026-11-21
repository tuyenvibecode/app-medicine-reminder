// app/(tabs)/index.tsx
// Màn hình chính "Hôm nay"
// Có thanh Lịch Tuần tiếng Việt (T2 -> T7, CN) chuẩn màu Teal dự án, thanh tiến độ và nhóm liều Sáng/Trưa/Chiều/Tối

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sun, Sunset, CloudSun, Moon, Plus, CheckCircle2, CalendarCheck } from 'lucide-react-native';
import { startOfWeek, addDays, isSameDay, format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { DoseCard } from '@/components/DoseCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/context/AppContext';
import type { DoseTimelineItem } from '@/types';

const VIETNAMESE_WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function TodayScreen() {
  const router = useRouter();
  const { doses, takeDose, undoTakeDose, snoozeDose } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Tạo danh sách 7 ngày trong tuần hiện tại (bắt đầu từ Thứ 2 -> Chủ Nhật)
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, idx) => {
      const dateObj = addDays(start, idx);
      return {
        date: dateObj,
        dayNumberStr: format(dateObj, 'dd'),
        dayLabel: VIETNAMESE_WEEKDAYS[idx],
        isToday: isSameDay(dateObj, new Date()),
      };
    });
  }, []);

  // Xử lý bấm "Đã uống" 1-chạm
  const handleTakeDose = (item: DoseTimelineItem) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    takeDose(item);
  };

  // Xử lý hoàn tác trạng thái "Đã uống"
  const handleUndoTakeDose = (item: DoseTimelineItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    undoTakeDose(item);
  };

  // Xử lý hoãn nhắc sau 15 phút
  const handleSnoozeDose = (item: DoseTimelineItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    snoozeDose(item);
    Alert.alert(
      'Đã hẹn nhắc lại',
      `Ứng dụng sẽ báo lại sau 15 phút cho liều "${item.medicationName}".`
    );
  };

  const sortedDoses = useMemo(
    () => [...doses].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
    [doses]
  );

  const takenCount = sortedDoses.filter((d) => d.status === 'taken').length;
  const totalCount = sortedDoses.length;
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const morningDoses = sortedDoses.filter((d) => d.timeGroup === 'morning');
  const noonDoses = sortedDoses.filter((d) => d.timeGroup === 'noon');
  const afternoonDoses = sortedDoses.filter((d) => d.timeGroup === 'afternoon');
  const eveningDoses = sortedDoses.filter((d) => d.timeGroup === 'evening');

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
              {isSameDay(selectedDate, new Date())
                ? `Hôm nay • ${format(selectedDate, 'dd/MM/yyyy')}`
                : `Ngày ${format(selectedDate, 'dd/MM/yyyy')}`}
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

        {/* THANH LỊCH TUẦN TIẾNG VIỆT (T2 -> T7, CN) - Chuẩn bố cục Hình số 2 & màu Teal dự án */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 18,
            gap: 6,
          }}
        >
          {weekDays.map((item) => {
            const isSelected = isSameDay(item.date, selectedDate);
            return (
              <TouchableOpacity
                key={item.dayLabel}
                activeOpacity={0.8}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setSelectedDate(item.date);
                }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: 5,
                  paddingBottom: 9,
                  alignItems: 'center',
                  backgroundColor: isSelected ? '#0D9488' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSelected ? '#0D9488' : '#E2E8F0',
                }}
              >
                {/* Ô vuông bo góc chứa số ngày (01, 02...) bên trên */}
                <View
                  style={{
                    width: '100%',
                    aspectRatio: 1,
                    borderRadius: 11,
                    backgroundColor: isSelected ? '#CCFBF1' : '#F8FAFC',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: isSelected ? '#0F766E' : '#0F172A',
                    }}
                  >
                    {item.dayNumberStr}
                  </Text>
                </View>

                {/* Nhãn Thứ (T2 -> T7, CN) bên dưới */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? '700' : '600',
                    color: isSelected
                      ? '#FFFFFF'
                      : item.dayLabel === 'CN'
                      ? '#EF4444'
                      : '#64748B',
                    marginTop: 7,
                  }}
                >
                  {item.dayLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
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

          {progressPercent === 100 && totalCount > 0 && (
            <View className="flex-row items-center mt-2.5">
              <CheckCircle2 size={16} color="#10B981" />
              <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-1.5">
                Tuyệt vời! Bạn đã uống đủ tất cả liều thuốc hôm nay.
              </Text>
            </View>
          )}
        </Card>

        {/* Trạng thái rỗng nếu chưa có lịch thuốc */}
        {totalCount === 0 && (
          <Card className="items-center justify-center py-10 px-4 border-border/70">
            <CalendarCheck size={40} color="#94A3B8" strokeWidth={1.5} />
            <Text className="text-base font-semibold text-foreground mt-3">
              Chưa có lịch nhắc hôm nay
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-1 mb-4">
              Hãy thêm thuốc mới hoặc đồng bộ từ đơn thuốc của dược sĩ gia đình.
            </Text>
            <Button
              variant="default"
              size="sm"
              className="bg-primary px-4 rounded-xl"
              onPress={() => router.push('/medication/add')}
            >
              <Text className="text-white font-semibold text-xs">+ Thêm thuốc ngay</Text>
            </Button>
          </Card>
        )}

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
                onUndoTake={handleUndoTakeDose}
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
                onUndoTake={handleUndoTakeDose}
              />
            ))}
          </View>
        )}

        {/* 3. Nhóm buổi Chiều */}
        {afternoonDoses.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center mb-2.5">
              <CloudSun size={18} color="#EA580C" strokeWidth={2.2} />
              <Text className="text-base font-bold text-foreground ml-2">
                Buổi chiều
              </Text>
            </View>
            {afternoonDoses.map((dose) => (
              <DoseCard
                key={dose.id}
                item={dose}
                onTake={handleTakeDose}
                onSnooze={handleSnoozeDose}
                onUndoTake={handleUndoTakeDose}
              />
            ))}
          </View>
        )}

        {/* 4. Nhóm buổi Tối */}
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
                onUndoTake={handleUndoTakeDose}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
