// Mục đích: Component chọn Giờ:Phút dạng con lăn cuộn bằng tay (Wheel Time Picker) mượt mà.
// src/components/ui/wheel-time-picker.tsx

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_VERTICAL = ITEM_HEIGHT * 2;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface WheelColumnProps {
  values: number[];
  selectedValue: number;
  onSelect: (value: number) => void;
  label: string;
}

function WheelColumn({ values, selectedValue, onSelect, label }: WheelColumnProps) {
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lastReportedRef = useRef<number>(selectedValue);

  // Cuộn tới giá trị hiện tại khi mở modal hoặc khi chọn nhanh từ bên ngoài (ví dụ :00, :15, :30, :45)
  useEffect(() => {
    lastReportedRef.current = selectedValue;
    const targetY = selectedValue * ITEM_HEIGHT;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: false });
    }, 30);
    return () => clearTimeout(timer);
  }, [selectedValue]);

  const handleScrollFinish = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    const nextVal = values[clamped];

    if (nextVal !== lastReportedRef.current) {
      lastReportedRef.current = nextVal;
      try {
        Haptics.selectionAsync();
      } catch {}
      onSelect(nextVal);
    }
  };

  const handleItemPress = (val: number) => {
    lastReportedRef.current = val;
    scrollRef.current?.scrollTo({ y: val * ITEM_HEIGHT, animated: true });
    try {
      Haptics.selectionAsync();
    } catch {}
    onSelect(val);
  };

  return (
    <View className="items-center">
      <View style={{ height: WHEEL_HEIGHT, width: 92, position: 'relative' }}>
        {/* Khung đánh dấu hàng đang được chọn ở chính giữa */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: PADDING_VERTICAL,
            left: 4,
            right: 4,
            height: ITEM_HEIGHT,
            borderRadius: 14,
            backgroundColor: 'rgba(13, 148, 136, 0.12)',
            borderWidth: 1,
            borderColor: 'rgba(13, 148, 136, 0.35)',
          }}
        />

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          nestedScrollEnabled
          bounces={false}
          contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
          onMomentumScrollEnd={handleScrollFinish}
          onScrollEndDrag={handleScrollFinish}
        >
          {values.map((val) => {
            const isSelected = val === selectedValue;
            return (
              <TouchableOpacity
                key={val}
                activeOpacity={0.7}
                onPress={() => handleItemPress(val)}
                style={{
                  height: ITEM_HEIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: isSelected ? 28 : 19,
                    fontWeight: isSelected ? '800' : '500',
                    color: isSelected ? '#0D9488' : '#94A3B8',
                  }}
                >
                  {String(val).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <Text className="text-xs font-semibold text-muted-foreground mt-1.5">{label}</Text>
    </View>
  );
}

export interface WheelTimePickerProps {
  hour: number;
  minute: number;
  onChangeHour: (hour: number) => void;
  onChangeMinute: (minute: number) => void;
}

export function WheelTimePicker({
  hour,
  minute,
  onChangeHour,
  onChangeMinute,
}: WheelTimePickerProps) {
  return (
    <View className="items-center my-3">
      <Text className="text-xs text-muted-foreground mb-2">
        Vuốt lên / xuống để chọn giờ và phút
      </Text>
      <View className="flex-row items-center justify-center gap-3">
        <WheelColumn
          values={HOURS}
          selectedValue={hour}
          onSelect={onChangeHour}
          label="Giờ"
        />
        <Text className="text-3xl font-extrabold text-foreground pb-6">:</Text>
        <WheelColumn
          values={MINUTES}
          selectedValue={minute}
          onSelect={onChangeMinute}
          label="Phút"
        />
      </View>
    </View>
  );
}
