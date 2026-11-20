// app/(tabs)/medications.tsx
// Màn hình "Tủ thuốc" (Danh sách thuốc hiện có trong gia đình)

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Pill, Search, Plus, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Medication } from '@/types';

const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'm1',
    user_id: 'u1',
    name: 'Amlodipine 5mg',
    dosage: '1 viên / ngày',
    notes: 'Uống sau bữa ăn sáng',
    stock: 24,
    low_stock_threshold: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'm2',
    user_id: 'u1',
    name: 'Omega 3 Dầu cá Nauy',
    dosage: '1 viên nang mềm / ngày',
    notes: 'Bảo quản nơi thoáng mát',
    stock: 12,
    low_stock_threshold: 7,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'm3',
    user_id: 'u1',
    name: 'Vitamin C 500mg',
    dosage: '1 viên / ngày',
    notes: 'Uống sau bữa trưa',
    stock: 4,
    low_stock_threshold: 5, // Cảnh báo
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'm4',
    user_id: 'u1',
    name: 'Magnesium B6',
    dosage: '1 viên trước khi ngủ',
    notes: 'Hỗ trợ giấc ngủ ngon',
    stock: 30,
    low_stock_threshold: 6,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function MedicationsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [medications] = useState<Medication[]>(INITIAL_MEDICATIONS);

  const filtered = medications.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-3">
        {/* Header */}
        <View className="flex-row items-center justify-between pb-3">
          <View>
            <Text className="text-xs font-semibold text-primary uppercase tracking-wider">
              Tủ thuốc
            </Text>
            <Text className="text-2xl font-bold text-foreground tracking-tight">
              Danh sách thuốc
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

        {/* Thanh tìm kiếm */}
        <View className="flex-row items-center bg-card border border-border/80 rounded-2xl px-3.5 h-12 mb-4">
          <Search size={18} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm theo tên thuốc..."
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2.5 text-base text-foreground"
          />
        </View>

        {/* Danh sách thuốc */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Pill size={40} color="#94A3B8" strokeWidth={1.5} />
              <Text className="text-base text-muted-foreground mt-3">
                Không tìm thấy loại thuốc nào
              </Text>
            </View>
          ) : (
            filtered.map((item) => {
              const isLowStock =
                item.stock !== null &&
                item.stock !== undefined &&
                item.low_stock_threshold !== null &&
                item.low_stock_threshold !== undefined &&
                item.stock <= item.low_stock_threshold;

              return (
                <Card
                  key={item.id}
                  className="mb-3 p-4 border-border/70 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1">
                    <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                      <Pill size={26} color="#0D9488" strokeWidth={1.8} />
                    </View>

                    <View className="flex-1 pl-3.5">
                      <Text
                        className="text-base font-semibold text-foreground tracking-tight"
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text className="text-sm text-muted-foreground mt-0.5">
                        {item.dosage || 'Chưa có thông tin liều'}
                      </Text>

                      <View className="flex-row items-center mt-1.5 space-x-2">
                        {item.stock !== null && (
                          <Badge
                            variant={isLowStock ? 'warning' : 'outline'}
                            label={`Còn ${item.stock} viên`}
                          />
                        )}

                        {isLowStock && (
                          <View className="flex-row items-center ml-1">
                            <AlertTriangle size={12} color="#F59E0B" />
                            <Text className="text-xs text-amber-600 dark:text-amber-400 ml-1 font-medium">
                              Sắp hết
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <ChevronRight size={20} color="#94A3B8" />
                </Card>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
