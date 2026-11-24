// Mục đích: Màn hình Quản lý Sức khoẻ gồm 2 tab: Đo máy Omron chuẩn Bộ Y tế và Hồ sơ đi khám & Đơn thuốc.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, HeartPulse, FileText } from 'lucide-react-native';
import { OmronTab } from '@/features/health/OmronTab';
import { VisitHistoryTab } from '@/features/health/VisitHistoryTab';

export default function HealthManagementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; autoCapture?: string }>();
  const [activeTab, setActiveTab] = useState<'omron' | 'visits'>(
    params.tab === 'visits' ? 'visits' : 'omron'
  );

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-11 w-11 rounded-full bg-muted/60 items-center justify-center mr-3"
          accessibilityLabel="Quay lại"
        >
          <ArrowLeft size={20} color="#64748B" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-primary uppercase tracking-wider">
            Theo dõi sức khoẻ
          </Text>
          <Text className="text-xl font-bold text-foreground">
            Quản lý Sức khoẻ
          </Text>
        </View>
      </View>

      {/* Thanh chuyển 2 tab lớn dễ bấm cho người lớn tuổi */}
      <View className="px-4 pt-3">
        <View className="flex-row bg-muted/70 p-1 rounded-2xl">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('omron')}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 13,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activeTab === 'omron' ? '#0D9488' : 'transparent',
            }}
          >
            <HeartPulse size={17} color={activeTab === 'omron' ? '#FFFFFF' : '#64748B'} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                marginLeft: 6,
                color: activeTab === 'omron' ? '#FFFFFF' : '#64748B',
              }}
            >
              Đo máy Omron
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('visits')}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 13,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activeTab === 'visits' ? '#0D9488' : 'transparent',
            }}
          >
            <FileText size={17} color={activeTab === 'visits' ? '#FFFFFF' : '#64748B'} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                marginLeft: 6,
                color: activeTab === 'visits' ? '#FFFFFF' : '#64748B',
              }}
            >
              Hồ sơ đi khám
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'omron' ? (
        <OmronTab autoCapture={params.autoCapture === 'true'} />
      ) : (
        <VisitHistoryTab />
      )}
    </SafeAreaView>
  );
}
