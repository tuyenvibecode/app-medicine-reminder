// src/components/DoseCard.tsx
// Thẻ liều thuốc trong ngày: Nút "Đã uống" to rõ 1-chạm, ảnh viên thuốc chủ đạo

import React from 'react';
import { View, Text } from 'react-native';
import { Pill, Clock, Check, AlertCircle, RotateCcw } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DoseTimelineItem } from '@/types';

interface DoseCardProps {
  item: DoseTimelineItem;
  onTake: (item: DoseTimelineItem) => void;
  onSnooze: (item: DoseTimelineItem) => void;
}

export function DoseCard({ item, onTake, onSnooze }: DoseCardProps) {
  const isTaken = item.status === 'taken';
  const isMissed = item.status === 'missed';
  const isUpcoming = item.status === 'upcoming';

  return (
    <Card className="mb-3.5 border-border/70 p-4">
      <View className="flex-row items-center space-x-3.5">
        {/* Khung ảnh viên thuốc (Hero visual) */}
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <Pill size={30} color="#0D9488" strokeWidth={1.8} />
        </View>

        {/* Thông tin tên và liều lượng */}
        <View className="flex-1 justify-center pl-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-foreground tracking-tight" numberOfLines={1}>
              {item.medicationName}
            </Text>
            {/* Giờ uống */}
            <View className="flex-row items-center bg-muted/60 px-2 py-0.5 rounded-lg">
              <Clock size={12} color="#64748B" />
              <Text className="text-xs font-semibold text-muted-foreground ml-1">
                {item.scheduledTime}
              </Text>
            </View>
          </View>

          <Text className="text-sm text-muted-foreground mt-0.5">
            {item.dosage}
          </Text>

          {/* Trạng thái chi tiết */}
          <View className="flex-row items-center mt-1.5 space-x-2">
            {isTaken && (
              <Badge variant="success" label="✓ Đã uống" />
            )}
            {isMissed && (
              <Badge variant="destructive" label="⚠ Quá giờ" />
            )}
            {isUpcoming && (
              <Badge variant="secondary" label="Chưa uống" />
            )}

            {item.stock !== undefined && item.lowStockThreshold !== undefined && item.stock <= item.lowStockThreshold && (
              <Badge variant="warning" label={`Còn ${item.stock} viên`} />
            )}
          </View>
        </View>
      </View>

      {/* Hành động (chỉ hiện khi chưa uống) */}
      {!isTaken ? (
        <View className="flex-row items-center space-x-2.5 pt-3.5 mt-3 border-t border-border/50">
          {/* Nút Đã uống TO, 1 chạm */}
          <Button
            variant="default"
            size="default"
            className="flex-1 bg-primary h-12 rounded-2xl"
            onPress={() => onTake(item)}
          >
            <View className="flex-row items-center justify-center">
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="text-primary-foreground font-semibold text-base ml-1.5">
                Đã uống
              </Text>
            </View>
          </Button>

          {/* Nút Nhắc lại sau 15p */}
          <Button
            variant="outline"
            size="default"
            className="h-12 px-3.5 rounded-2xl border-border/80"
            onPress={() => onSnooze(item)}
          >
            <View className="flex-row items-center justify-center">
              <RotateCcw size={15} color="#64748B" />
              <Text className="text-muted-foreground font-medium text-xs ml-1">
                15 phút
              </Text>
            </View>
          </Button>
        </View>
      ) : (
        <View className="flex-row items-center justify-between pt-2.5 mt-2 border-t border-border/40">
          <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Đã hoàn thành liều này đúng giờ
          </Text>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onPress={() => onSnooze(item)}
          >
            <Text className="text-xs text-muted-foreground underline">Đổi trạng thái</Text>
          </Button>
        </View>
      )}
    </Card>
  );
}
