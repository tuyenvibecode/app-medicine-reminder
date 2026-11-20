// app/(tabs)/history.tsx
// Màn hình "Lịch sử" uống thuốc và tỷ lệ tuân thủ

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, CheckCircle, Clock } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HistoryLogItem {
  id: string;
  medicationName: string;
  dosage: string;
  takenTime: string;
  dateStr: string;
  status: 'taken' | 'skipped' | 'missed';
}

const SAMPLE_LOGS: HistoryLogItem[] = [
  {
    id: 'l1',
    medicationName: 'Amlodipine (Huyết áp)',
    dosage: '1 viên 5mg',
    takenTime: '07:35',
    dateStr: 'Hôm nay',
    status: 'taken',
  },
  {
    id: 'l2',
    medicationName: 'Magnesium B6',
    dosage: '1 viên',
    takenTime: '21:10',
    dateStr: 'Hôm qua',
    status: 'taken',
  },
  {
    id: 'l3',
    medicationName: 'Vitamin C 500mg',
    dosage: '1 viên',
    takenTime: '12:45',
    dateStr: 'Hôm qua',
    status: 'taken',
  },
  {
    id: 'l4',
    medicationName: 'Amlodipine (Huyết áp)',
    dosage: '1 viên 5mg',
    takenTime: '07:40',
    dateStr: 'Hôm qua',
    status: 'taken',
  },
];

export default function HistoryScreen() {
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
        <View className="flex-row space-x-3 mb-5">
          {/* Chuỗi ngày streak */}
          <Card className="flex-1 p-4 border-border/80">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-medium text-muted-foreground">
                Chuỗi duy trì
              </Text>
              <Flame size={18} color="#F59E0B" />
            </View>
            <Text className="text-2xl font-bold text-foreground mt-2">
              7 ngày
            </Text>
            <Text className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Đúng giờ liên tục
            </Text>
          </Card>

          {/* Tỷ lệ hoàn thành */}
          <Card className="flex-1 p-4 border-border/80">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-medium text-muted-foreground">
                Tỷ lệ tuân thủ
              </Text>
              <CheckCircle size={18} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-foreground mt-2">
              95%
            </Text>
            <Text className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Rất xuất sắc
            </Text>
          </Card>
        </View>

        {/* Danh sách nhật ký đã uống */}
        <Text className="text-base font-bold text-foreground mb-3">
          Gần đây
        </Text>

        {SAMPLE_LOGS.map((item) => (
          <Card key={item.id} className="mb-2.5 p-3.5 border-border/70">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
