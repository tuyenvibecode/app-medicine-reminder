// Mục đích: Màn hình Tủ thuốc quản lý danh sách thuốc gia đình, số viên còn lại và cảnh báo sắp hết.
// app/(tabs)/medications.tsx
// Màn hình "Tủ thuốc" (Danh sách thuốc hiện có trong gia đình)
// Hiển thị trực quan thuốc theo đợt điều trị (ví dụ: 30/90 viên) và cảnh báo sắp hết

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  Pill,
  Search,
  Plus,
  AlertTriangle,
  ShoppingBag,
  Archive,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AppAlert as Alert } from '@/components/ui/app-dialog';
import { useAppStore } from '@/context/AppContext';
import type { Medication } from '@/types';

export default function MedicationsScreen() {
  const router = useRouter();
  const {
    medications,
    refillMedication,
    archiveMedication,
    restoreMedication,
    deleteMedication,
  } = useAppStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Modal nạp thêm thuốc (khi mua thêm đợt mới)
  const [refillModalVisible, setRefillModalVisible] = useState(false);
  const [refillMed, setRefillMed] = useState<Medication | null>(null);
  const [refillAmount, setRefillAmount] = useState('30');

  const activeMeds = medications.filter((m) => m.is_active !== false);
  const archivedMeds = medications.filter((m) => m.is_active === false);
  const currentTabList = activeTab === 'active' ? activeMeds : archivedMeds;

  const filtered = currentTabList.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleArchiveMedication = (med: Medication) => {
    Alert.alert(
      'Ngừng uống thuốc này?',
      `"${med.name}" sẽ được chuyển sang mục Đã ngừng và tắt toàn bộ lịch báo thức. Lịch sử các ngày đã uống vẫn được giữ lại.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Ngừng uống',
          onPress: () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            archiveMedication(med.id);
          },
        },
      ]
    );
  };

  const handleRestoreMedication = (med: Medication) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    restoreMedication(med.id);
    Alert.alert('Đã khôi phục', `"${med.name}" đã quay lại danh sách Đang dùng và bật lại lịch nhắc.`);
  };

  const handleDeleteMedication = (med: Medication) => {
    Alert.alert(
      'Xoá hẳn thuốc này?',
      `Xoá vĩnh viễn "${med.name}" khỏi Tủ thuốc và huỷ toàn bộ lịch nhắc. Dùng khi thêm nhầm hoặc không cần lưu nữa.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá hẳn',
          style: 'destructive',
          onPress: () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
            deleteMedication(med.id);
          },
        },
      ]
    );
  };

  const openRefillModal = (med: Medication) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setRefillMed(med);
    // Gợi ý số lượng bổ sung còn thiếu hoặc mặc định 30
    if (med.total_course_stock && med.stock !== null && med.stock !== undefined) {
      const needed = Math.max(0, med.total_course_stock - med.stock);
      setRefillAmount(needed > 0 ? (needed > 30 ? '30' : needed.toString()) : '30');
    } else {
      setRefillAmount('30');
    }
    setRefillModalVisible(true);
  };

  const handleConfirmRefill = () => {
    if (!refillMed) return;
    const addCount = parseInt(refillAmount, 10);
    if (isNaN(addCount) || addCount <= 0) {
      Alert.alert('Số lượng không hợp lệ', 'Vui lòng nhập số viên hợp lệ.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    refillMedication(refillMed.id, addCount);

    setRefillModalVisible(false);
    Alert.alert(
      'Đã cập nhật',
      `Đã cộng thêm ${addCount} viên vào tủ thuốc cho "${refillMed.name}".`
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
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

        {/* Thanh chuyển 2 tab: Đang dùng | Đã ngừng (Lưu trữ) */}
        <View className="flex-row bg-muted/70 p-1 rounded-2xl mb-3">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('active')}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 13,
              alignItems: 'center',
              backgroundColor: activeTab === 'active' ? '#0D9488' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: activeTab === 'active' ? '#FFFFFF' : '#64748B',
              }}
            >
              Đang dùng ({activeMeds.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('archived')}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 13,
              alignItems: 'center',
              backgroundColor: activeTab === 'archived' ? '#0D9488' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: activeTab === 'archived' ? '#FFFFFF' : '#64748B',
              }}
            >
              Đã ngừng ({archivedMeds.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Thanh tìm kiếm */}
        <View className="flex-row items-center bg-card border border-border/80 rounded-2xl px-3.5 h-12 mb-3">
          <Search size={18} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              activeTab === 'active'
                ? 'Tìm thuốc đang dùng...'
                : 'Tìm trong kho thuốc đã ngừng...'
            }
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2.5 text-base text-foreground"
          />
        </View>

        {/* Danh sách thuốc */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View className="items-center justify-center py-12 px-4">
              <Pill size={40} color="#94A3B8" strokeWidth={1.5} />
              <Text className="text-base font-semibold text-foreground mt-3 text-center">
                {search.trim()
                  ? 'Không tìm thấy thuốc phù hợp'
                  : activeTab === 'active'
                    ? 'Tủ thuốc đang trống'
                    : 'Chưa có thuốc nào đã ngừng'}
              </Text>
              {!search.trim() && activeTab === 'active' && (
                <>
                  <Text className="text-xs text-muted-foreground text-center mt-1 mb-4">
                    Thêm thuốc bạn đang dùng để theo dõi số viên còn lại và nhận nhắc uống đúng giờ.
                  </Text>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary px-4 rounded-xl"
                    onPress={() => router.push('/medication/add')}
                  >
                    <Text className="text-white font-semibold text-xs">+ Thêm thuốc ngay</Text>
                  </Button>
                </>
              )}
            </View>
          ) : (
            filtered.map((item) => {
              const currentStock = item.stock || 0;
              const totalCourse = item.total_course_stock;
              const isCourse = item.treatment_type === 'course' && totalCourse && totalCourse > 0;
              const isLowStock =
                item.low_stock_threshold !== null &&
                item.low_stock_threshold !== undefined &&
                currentStock <= item.low_stock_threshold;
              const courseDeficit = isCourse ? Math.max(0, totalCourse - currentStock) : 0;
              const courseProgress = isCourse ? Math.min(100, Math.round((currentStock / totalCourse) * 100)) : 100;

              return (
                <Card key={item.id} className="mb-3.5 p-4 border-border/70">
                  {/* Hàng trên: Ảnh, tên và badge */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 mr-2">
                      {item.image ? (
                        <Image
                          source={{ uri: item.image }}
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                          }}
                          contentFit="cover"
                        />
                      ) : (
                        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                          <Pill size={26} color="#0D9488" strokeWidth={1.8} />
                        </View>
                      )}

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
                      </View>
                    </View>

                    {/* Số lượng hiện có */}
                    <View className="items-end">
                      {isCourse ? (
                        <View className="items-end">
                          <Badge
                            variant={currentStock >= totalCourse ? 'success' : 'warning'}
                            label={`${currentStock}/${totalCourse} viên`}
                          />
                          <Text className="text-[10px] text-muted-foreground mt-0.5">
                            Liệu trình {item.course_duration_months || 1} tháng
                          </Text>
                        </View>
                      ) : (
                        <Badge
                          variant={isLowStock ? 'warning' : 'outline'}
                          label={`Còn ${currentStock} viên`}
                        />
                      )}
                    </View>
                  </View>

                  {/* Thanh tiến độ số lượng đối với thuốc liệu trình */}
                  {isCourse && (
                    <View className="mt-3 pt-2.5 border-t border-border/40">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-muted-foreground font-medium">
                          Tiến độ thuốc cả đợt ({courseProgress}%)
                        </Text>
                        <Text className="text-xs font-semibold text-foreground">
                          {currentStock >= totalCourse ? 'Đã đủ cả đợt' : `Thiếu ${courseDeficit} viên`}
                        </Text>
                      </View>

                      <View className="w-full h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                        <View
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${courseProgress}%` }}
                        />
                      </View>
                    </View>
                  )}

                  {/* Cảnh báo thuốc sắp hết trong tủ */}
                  {isLowStock && (
                    <View className="flex-row items-center mt-2 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20">
                      <AlertTriangle size={14} color="#F59E0B" />
                      <Text className="text-xs text-amber-700 dark:text-amber-300 font-medium ml-1.5 flex-1">
                        Thuốc trong tủ sắp hết (còn {currentStock} viên). Hãy chuẩn bị mua thêm!
                      </Text>
                    </View>
                  )}

                  {/* Ghi chú & Hàng nút hành động: Mua thêm / Ngừng uống (hoặc Dùng lại) / Xoá */}
                  <View className="pt-3 mt-2.5 border-t border-border/40">
                    <Text className="text-xs text-muted-foreground mb-2.5" numberOfLines={1}>
                      {item.notes || 'Dùng đều đặn mỗi ngày'}
                    </Text>

                    <View className="flex-row items-center justify-end gap-2">
                      {activeTab === 'active' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 rounded-xl border-primary/30 bg-primary/5"
                            onPress={() => openRefillModal(item)}
                          >
                            <View className="flex-row items-center">
                              <ShoppingBag size={13} color="#0D9488" />
                              <Text className="text-xs font-semibold text-primary ml-1">
                                + Mua thêm
                              </Text>
                            </View>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 rounded-xl border-border"
                            onPress={() => handleArchiveMedication(item)}
                          >
                            <View className="flex-row items-center">
                              <Archive size={13} color="#64748B" />
                              <Text className="text-xs font-semibold text-muted-foreground ml-1">
                                Ngừng uống
                              </Text>
                            </View>
                          </Button>

                          <TouchableOpacity
                            onPress={() => handleDeleteMedication(item)}
                            accessibilityLabel={`Xoá hẳn thuốc ${item.name}`}
                            className="h-9 w-9 rounded-xl bg-red-500/10 border border-red-500/20 items-center justify-center"
                          >
                            <Trash2 size={15} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 rounded-xl border-primary/30 bg-primary/5"
                            onPress={() => handleRestoreMedication(item)}
                          >
                            <View className="flex-row items-center">
                              <RotateCcw size={13} color="#0D9488" />
                              <Text className="text-xs font-semibold text-primary ml-1">
                                Dùng lại
                              </Text>
                            </View>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 rounded-xl border-red-500/30 bg-red-500/5"
                            onPress={() => handleDeleteMedication(item)}
                          >
                            <View className="flex-row items-center">
                              <Trash2 size={13} color="#EF4444" />
                              <Text className="text-xs font-semibold text-red-500 ml-1">
                                Xoá hẳn
                              </Text>
                            </View>
                          </Button>
                        </>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Modal nạp thêm thuốc nhanh */}
      <Modal
        visible={refillModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRefillModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <Card className="w-full max-w-sm p-5 border-border bg-card">
            <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
              <View className="flex-row items-center">
                <ShoppingBag size={20} color="#0D9488" />
                <Text className="text-base font-bold text-foreground ml-2">
                  Mua thêm thuốc
                </Text>
              </View>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onPress={() => setRefillModalVisible(false)}
              >
                <X size={18} color="#64748B" />
              </Button>
            </View>

            <Text className="text-sm text-foreground mt-3 font-semibold">
              {refillMed?.name}
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              Hiện có trong tủ: {refillMed?.stock || 0} viên{' '}
              {refillMed?.total_course_stock ? `(Liệu trình: ${refillMed.total_course_stock} viên)` : ''}
            </Text>

            <Text className="text-xs font-semibold text-foreground mt-4 mb-1.5">
              Số lượng viên vừa mua thêm:
            </Text>
            <Input
              value={refillAmount}
              onChangeText={setRefillAmount}
              placeholder="30"
              keyboardType="numeric"
              className="mb-4"
            />

            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onPress={() => setRefillModalVisible(false)}
              >
                <Text className="text-sm text-muted-foreground">Huỷ</Text>
              </Button>

              <Button
                variant="default"
                className="flex-1 bg-primary h-11 rounded-xl"
                onPress={handleConfirmRefill}
              >
                <Text className="text-sm font-semibold text-white">Xác nhận</Text>
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
