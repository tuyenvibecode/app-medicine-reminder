// app/(tabs)/index.tsx
// Màn hình chính "Hôm nay"
// Tích hợp Thanh Lịch Full Tháng có Swiper trượt ngang mượt mà (xem lại tuần trước / cả tháng),
// nút chuyển Tháng trước/sau, nút quay về "Hôm nay" 1-chạm và tự động cuộn tới ngày hiện tại.

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Sun,
  Sunset,
  CloudSun,
  Moon,
  Plus,
  CheckCircle2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react-native';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  format,
  getDay,
} from 'date-fns';
import * as Haptics from 'expo-haptics';
import { DoseCard } from '@/components/DoseCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/context/AppContext';
import type { DoseTimelineItem } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_ITEM_WIDTH = 50;
const DAY_ITEM_GAP = 8;

// getDay() của date-fns: 0 = Chủ nhật, 1 = Thứ 2 ... 6 = Thứ 7
function getVietnameseWeekday(date: Date): string {
  const day = getDay(date);
  if (day === 0) return 'CN';
  return `T${day + 1}`;
}

export default function TodayScreen() {
  const router = useRouter();
  const { doses, takeDose, undoTakeDose, snoozeDose } = useAppStore();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const monthScrollRef = useRef<ScrollView>(null);

  // Tạo danh sách toàn bộ các ngày trong tháng đang xem (01 -> 30/31)
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const today = new Date();

    return days.map((dateObj) => ({
      date: dateObj,
      dayNumberStr: format(dateObj, 'dd'),
      dayLabel: getVietnameseWeekday(dateObj),
      isToday: isSameDay(dateObj, today),
    }));
  }, [currentMonth]);

  // Tự động trượt (scroll) thanh Swiper đến vị trí ngày đang chọn (nằm giữa màn hình)
  const scrollToDate = useCallback((targetDate: Date, animated = true) => {
    const dayOfMonth = targetDate.getDate(); // 1..31
    const itemTotalWidth = DAY_ITEM_WIDTH + DAY_ITEM_GAP;
    const targetOffset = Math.max(
      0,
      (dayOfMonth - 1) * itemTotalWidth - SCREEN_WIDTH / 2 + DAY_ITEM_WIDTH / 2 + 16
    );
    setTimeout(() => {
      monthScrollRef.current?.scrollTo({ x: targetOffset, animated });
    }, 80);
  }, []);

  useEffect(() => {
    scrollToDate(selectedDate, false);
    // Chỉ cuộn lần đầu khi mở màn hình
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chuyển sang tháng trước / tháng sau
  const handlePrevMonth = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const prev = subMonths(currentMonth, 1);
    setCurrentMonth(prev);
    const firstDay = startOfMonth(prev);
    setSelectedDate(firstDay);
    scrollToDate(firstDay, true);
  };

  const handleNextMonth = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const next = addMonths(currentMonth, 1);
    setCurrentMonth(next);
    const firstDay = startOfMonth(next);
    setSelectedDate(firstDay);
    scrollToDate(firstDay, true);
  };

  // Quay về đúng ngày Hôm nay 1-chạm
  const handleJumpToToday = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
    scrollToDate(today, true);
  };

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

  const isViewingToday = isSameDay(selectedDate, new Date());

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Lời chào và nút Thêm thuốc nhanh */}
        <View className="flex-row items-center justify-between pb-2.5">
          <View>
            <Text className="text-xs font-semibold text-primary uppercase tracking-wider">
              {isViewingToday
                ? `Hôm nay • ${format(selectedDate, 'dd/MM/yyyy')}`
                : `${getVietnameseWeekday(selectedDate)} • Ngày ${format(
                    selectedDate,
                    'dd/MM/yyyy'
                  )}`}
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

        {/* Thanh điều khiển Tháng & Nút quay nhanh về Hôm nay */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                height: 28,
                width: 28,
                borderRadius: 8,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={16} color="#0F172A" />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: '#0F172A',
                marginHorizontal: 10,
              }}
            >
              Tháng {format(currentMonth, 'MM / yyyy')}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                height: 28,
                width: 28,
                borderRadius: 8,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={16} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {(!isViewingToday || !isSameMonth(currentMonth, new Date())) && (
            <TouchableOpacity
              onPress={handleJumpToToday}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(13, 148, 136, 0.12)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <RotateCcw size={12} color="#0D9488" />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#0D9488',
                  marginLeft: 4,
                }}
              >
                Về hôm nay
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* THANH SWIPER LỊCH FULL THÁNG (Vuốt ngang xem lại tuần trước & cả tháng dễ dàng) */}
        <ScrollView
          ref={monthScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: DAY_ITEM_GAP,
            paddingVertical: 4,
            paddingRight: 8,
          }}
          style={{ marginBottom: 16 }}
        >
          {monthDays.map((item) => {
            const isSelected = isSameDay(item.date, selectedDate);
            return (
              <TouchableOpacity
                key={item.dayNumberStr}
                activeOpacity={0.8}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setSelectedDate(item.date);
                  scrollToDate(item.date, true);
                }}
                style={{
                  width: DAY_ITEM_WIDTH,
                  borderRadius: 16,
                  padding: 5,
                  paddingBottom: 9,
                  alignItems: 'center',
                  backgroundColor: isSelected ? '#0D9488' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSelected
                    ? '#0D9488'
                    : item.isToday
                    ? '#0D9488'
                    : '#E2E8F0',
                }}
              >
                {/* Ô vuông bo góc chứa số ngày (01..31) bên trên */}
                <View
                  style={{
                    width: '100%',
                    aspectRatio: 1,
                    borderRadius: 11,
                    backgroundColor: isSelected
                      ? '#CCFBF1'
                      : item.isToday
                      ? '#F0FDFA'
                      : '#F8FAFC',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: isSelected
                        ? '#0F766E'
                        : item.isToday
                        ? '#0D9488'
                        : '#0F172A',
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
                    marginTop: 6,
                  }}
                >
                  {item.dayLabel}
                </Text>

                {/* Chấm nhỏ đánh dấu ngày Hôm nay */}
                {item.isToday && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 999,
                      backgroundColor: isSelected ? '#FFFFFF' : '#0D9488',
                      marginTop: 2,
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Thẻ tiến độ trong ngày */}
        <Card className="mb-5 bg-card border-border/80 p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-medium text-muted-foreground">
                Tiến độ hoàn thành
              </Text>
              <Text className="text-xl font-bold text-foreground mt-0.5">
                {takenCount}/{totalCount} liều {isViewingToday ? 'hôm nay' : format(selectedDate, 'dd/MM')}
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
