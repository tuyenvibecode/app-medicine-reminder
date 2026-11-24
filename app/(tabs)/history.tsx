// Mục đích: Màn hình hiển thị lịch sử uống thuốc và tỷ lệ tuân thủ theo ngày.
// app/(tabs)/history.tsx
// Màn hình "Lịch sử" uống thuốc và tỷ lệ tuân thủ

import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { subDays } from 'date-fns';
import { Flame, CheckCircle, Clock, ClipboardList } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/context/AppContext';

const MAX_STREAK_LOOKBACK_DAYS = 365;

export default function HistoryScreen() {
  const { historyLogs, getDosesForDate, isDateCompleted } = useAppStore();

  const todayDoses = getDosesForDate(new Date());
  const takenToday = todayDoses.filter((d) => d.status === 'taken').length;
  const totalToday = todayDoses.length;
  const adherenceRate =
    totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : null;

  // Tính chuỗi ngày liên tiếp uống đủ thuốc từ dữ liệu thực tế (nếu hôm nay chưa hết ngày thì đếm tiếp từ hôm qua)
  const streakDays = useMemo(() => {
    const today = new Date();
    let count = 0;
    const startOffset = isDateCompleted(today) ? 0 : 1;

    for (let i = startOffset; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
      if (isDateCompleted(subDays(today, i))) {
        count += 1;
      } else {
        break;
      }
    }
    return count;
  }, [isDateCompleted]);

  const adherenceHint =
    adherenceRate === null
      ? 'Chưa có lịch thuốc'
      : adherenceRate === 100
        ? 'Hoàn thành đủ hôm nay'
        : adherenceRate >= 50
          ? 'Đang duy trì tốt'
          : 'Chờ hoàn thành các cữ';

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
            Theo dõi
          </Text>
          <Text className="text-2xl font-bold text-foreground tracking-tight">
            Lịch sử uống thuốc
          </Text>
        </View>

        {/* Thẻ thống kê Streak & Tuân thủ */}
        <View className="flex-row gap-3 mb-5">
          {/* Chuỗi ngày streak */}
          <Card className="flex-1 p-4 border-border/80">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-medium text-muted-foreground">
                Chuỗi duy trì
              </Text>
              <Flame size={18} color="#F59E0B" />
            </View>
            <Text className="text-2xl font-bold text-foreground mt-2">
              {streakDays} ngày
            </Text>
            <Text className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {streakDays > 0 ? 'Đúng giờ liên tục' : 'Chưa có chuỗi ngày'}
            </Text>
          </Card>

          {/* Tỷ lệ hoàn thành */}
          <Card className="flex-1 p-4 border-border/80">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-medium text-muted-foreground">
                Tỷ lệ hôm nay
              </Text>
              <CheckCircle size={18} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-foreground mt-2">
              {adherenceRate !== null ? `${adherenceRate}%` : '—'}
            </Text>
            <Text className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {adherenceHint}
            </Text>
          </Card>
        </View>

        {/* Danh sách nhật ký đã uống */}
        <Text className="text-base font-bold text-foreground mb-3">
          Gần đây ({historyLogs.length})
        </Text>

        {historyLogs.length === 0 ? (
          <Card className="items-center justify-center py-10 px-4 border-border/70">
            <ClipboardList size={38} color="#94A3B8" strokeWidth={1.5} />
            <Text className="text-base font-semibold text-foreground mt-3">
              Chưa có nhật ký uống thuốc
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-1">
              Khi bạn bấm Đã uống ở màn Hôm nay, lịch sử sẽ tự động lưu lại tại đây.
            </Text>
          </Card>
        ) : (
          historyLogs.map((item) => (
            <Card key={item.id} className="mb-2.5 p-3.5 border-border/70">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    {item.medicationName}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {item.dosage} • {item.dateStr}
                  </Text>
                </View>

                <View className="items-end">
                  <Badge variant="success" label="✓ Đã uống" />
                  <View className="flex-row items-center mt-1">
                    <Clock size={11} color="#64748B" />
                    <Text className="text-xs text-muted-foreground ml-1">
                      {item.takenTime}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
