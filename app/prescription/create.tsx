// app/prescription/create.tsx
// Màn hình Lên đơn thuốc dành cho Dược sĩ gia đình
// Tìm kiếm thuốc từ data chi_thuoc.json, chọn số lượng viên và xuất Phiếu Note Toa thuốc có ảnh

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  Search,
  Plus,
  Trash2,
  FileText,
  Pill,
  CalendarCheck,
  AlertCircle,
  X,
  ChevronRight,
  Share2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { searchMedicines } from '@/services/medicineService';
import { useAppStore } from '@/context/AppContext';
import type { CatalogMedicine, PrescriptionMedicineItem } from '@/types';

// Tuỳ chọn hướng dẫn nhanh khi chọn liều thuốc
const QUICK_DOSAGE_OPTIONS = [
  'Ngày 2 lần, mỗi lần 1 viên sau ăn',
  'Ngày 3 lần, mỗi lần 1 viên sau ăn',
  'Ngày 1 lần vào buổi sáng',
  '1 viên trước khi ngủ 30 phút',
  'Uống khi có triệu chứng đau',
];

export default function CreatePrescriptionScreen() {
  const router = useRouter();
  const { syncPrescriptionToReminders } = useAppStore();

  // Tab giao diện: 'builder' (Chọn thuốc) hoặc 'note' (Xem phiếu đơn thuốc hoàn chỉnh)
  const [activeTab, setActiveTab] = useState<'builder' | 'note'>('builder');

  // Thông tin đơn thuốc & dặn dò
  const [noteTitle, setNoteTitle] = useState('Phiếu mua thuốc');
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionMedicineItem[]>([]);

  // Tìm kiếm thuốc & bộ lọc thuốc không kê đơn (an toàn y tế rule 04)
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<'all' | 'Thuốc không kê đơn'>('all');

  const searchResults = useMemo(() => {
    return searchMedicines(searchQuery, {
      limit: 25,
      classification: classificationFilter,
    });
  }, [searchQuery, classificationFilter]);

  // Modal tùy chỉnh liều & số lượng khi thêm thuốc
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<CatalogMedicine | null>(null);
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState('viên');
  const [dosageInstruction, setDosageInstruction] = useState('Ngày 2 lần, mỗi lần 1 viên sau ăn');
  const [durationDays, setDurationDays] = useState('5');
  const [itemNotes, setItemNotes] = useState('');

  // Chuyển sang màn Xem Phiếu Note an toàn, tránh lỗi dynamic shadow interop của NativeWind v4
  const handleOpenNoteView = useCallback(() => {
    if (prescriptionItems.length === 0) {
      Alert.alert(
        'Chưa có thuốc trong đơn',
        'Vui lòng bấm "+ Chọn" ít nhất 1 loại thuốc bên dưới trước khi xem phiếu dặn dò.'
      );
      return;
    }
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveTab('note');
  }, [prescriptionItems.length]);

  const handleOpenBuilderView = useCallback(() => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveTab('builder');
  }, []);

  // Mở modal thêm thuốc
  const handleSelectMedicine = (med: CatalogMedicine) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedMedicine(med);

    // Tự động nhận diện đơn vị và liều gợi ý theo dạng bào chế
    const form = med.dosage_form || '';
    if (form.includes('gói')) {
      setUnit('gói');
      setQuantity('6');
      setDosageInstruction('Ngày 2 lần, mỗi lần 1 gói pha nước ấm');
    } else if (form.includes('Kem') || form.includes('Gel') || form.includes('tuýp')) {
      setUnit('tuýp');
      setQuantity('1');
      setDosageInstruction('Bôi một lớp mỏng ngoài da ngày 2 lần');
    } else if (form.includes('Dung dịch') || form.includes('chai') || form.includes('Siro')) {
      setUnit('chai');
      setQuantity('1');
      setDosageInstruction('Uống 10ml mỗi lần, ngày 2 lần');
    } else {
      setUnit('viên');
      setQuantity('10');
      setDosageInstruction('Ngày 2 lần, mỗi lần 1 viên sau ăn');
    }

    setDurationDays('5');
    setItemNotes('');
    setModalVisible(true);
  };

  // Xác nhận thêm thuốc vào đơn
  const handleConfirmAddMedicine = () => {
    if (!selectedMedicine) return;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Số lượng không hợp lệ', 'Vui lòng nhập số lượng lớn hơn 0.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const newItem: PrescriptionMedicineItem = {
      id: `item-${Date.now()}`,
      name: selectedMedicine.name,
      image: selectedMedicine.image,
      dosageForm: selectedMedicine.dosage_form,
      quantity: qty,
      unit: unit,
      dosageInstruction: dosageInstruction,
      durationDays: parseInt(durationDays, 10) || 5,
      notes: itemNotes,
      classification: selectedMedicine.classification,
    };

    setPrescriptionItems((prev) => [...prev, newItem]);
    setModalVisible(false);
    setSelectedMedicine(null);
  };

  // Xóa một thuốc khỏi đơn
  const handleRemoveItem = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setPrescriptionItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0) {
        setActiveTab('builder');
      }
      return next;
    });
  };

  // Thêm toàn bộ thuốc trong đơn vào lịch nhắc 1-chạm
  const handleSyncToReminders = () => {
    if (prescriptionItems.length === 0) {
      Alert.alert('Chưa có thuốc', 'Vui lòng thêm ít nhất một loại thuốc vào đơn.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    syncPrescriptionToReminders(prescriptionItems);

    Alert.alert(
      'Đã lên lịch nhắc thuốc!',
      `Toàn bộ ${prescriptionItems.length} loại thuốc trong đơn đã được tự động thêm vào Tủ thuốc và Lịch nhắc uống thuốc hàng ngày của gia đình.`,
      [{ text: 'Xem Lịch nhắc', onPress: () => router.replace('/(tabs)' as any) }]
    );
  };

  // Chia sẻ phiếu note mua thuốc qua Zalo / Messenger / Tin nhắn
  const handleShareNote = async () => {
    if (prescriptionItems.length === 0) {
      Alert.alert('Chưa có thuốc', 'Vui lòng chọn ít nhất một loại thuốc trước khi chia sẻ.');
      return;
    }

    try {
      Haptics.selectionAsync();
    } catch {}

    const dateStr = new Date().toLocaleDateString('vi-VN');
    const lines = prescriptionItems.map((item, idx) => {
      const usageLine = item.dosageInstruction ? `\n   • Cách dùng: ${item.dosageInstruction}` : '';
      const noteLine = item.notes ? `\n   • Ghi chú: ${item.notes}` : '';
      return `${idx + 1}. ${item.name}\n   👉 Mua: ${item.quantity} ${item.unit}${usageLine}${noteLine}`;
    });

    const extraNote = generalInstructions.trim()
      ? `\n\n📌 Ghi chú: ${generalInstructions.trim()}`
      : '';

    const shareMessage =
      `📝 ${noteTitle.toUpperCase()} (${dateStr})\n` +
      `------------------------\n` +
      lines.join('\n\n') +
      extraNote +
      `\n------------------------\n(Đưa phiếu này cho dược sĩ tại hiệu thuốc)`;

    try {
      await Share.share({
        title: noteTitle,
        message: shareMessage,
      });
    } catch {
      Alert.alert('Lỗi', 'Không thể mở bảng chia sẻ trên thiết bị này.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      {/* Header chuẩn: Không dùng dynamic shadow trên TouchableOpacity để tránh lỗi NativeWind v4 */}
      <View className="px-4 pt-3 pb-3 bg-card border-b border-border/60">
        {/* Hàng 1: Tiêu đề thoáng đãng */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mr-2.5">
              <FileText size={20} color="#0D9488" strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">
                Tạo đơn thuốc
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Kho 2,000+ thuốc An Khang & Phiếu note
              </Text>
            </View>
          </View>

          {/* Huy hiệu số thuốc đã chọn (bấm chuyển đổi nhanh) */}
          {prescriptionItems.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                activeTab === 'builder' ? handleOpenNoteView() : handleOpenBuilderView()
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                backgroundColor: 'rgba(13, 148, 136, 0.12)',
                borderColor: 'rgba(13, 148, 136, 0.35)',
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Pill size={13} color="#0D9488" />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#0D9488',
                  marginLeft: 6,
                }}
              >
                {activeTab === 'builder' ? `${prescriptionItems.length} thuốc ➔` : '← Kê thêm'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Hàng 2: Segmented Control chuyển đổi giữa Kê thuốc và Phiếu note */}
        <View className="flex-row bg-muted/70 p-1 rounded-2xl mt-3">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenBuilderView}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              flexDirection: 'row',
              backgroundColor: activeTab === 'builder' ? '#FFFFFF' : 'transparent',
              borderWidth: activeTab === 'builder' ? 1 : 0,
              borderColor: activeTab === 'builder' ? '#E2E8F0' : 'transparent',
            }}
          >
            <Search
              size={14}
              color={activeTab === 'builder' ? '#0D9488' : '#64748B'}
              strokeWidth={2.2}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                marginLeft: 6,
                color: activeTab === 'builder' ? '#0D9488' : '#64748B',
              }}
            >
              1. Kê & Chọn thuốc
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenNoteView}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              flexDirection: 'row',
              backgroundColor: activeTab === 'note' ? '#FFFFFF' : 'transparent',
              borderWidth: activeTab === 'note' ? 1 : 0,
              borderColor: activeTab === 'note' ? '#E2E8F0' : 'transparent',
            }}
          >
            <FileText
              size={14}
              color={activeTab === 'note' ? '#0D9488' : '#64748B'}
              strokeWidth={2.2}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                marginLeft: 6,
                color: activeTab === 'note' ? '#0D9488' : '#64748B',
              }}
            >
              2. Phiếu note {prescriptionItems.length > 0 ? `(${prescriptionItems.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Khung nội dung chính: Giữ chung cấu trúc View flex-1 để chuyển tab mượt mà */}
      <View className="flex-1">
        {activeTab === 'builder' ? (
          /* ================= CHẾ ĐỘ 1: KÊ THUỐC & TÌM KIẾM ================= */
          <View key="tab-builder-view" className="flex-1">
            <ScrollView
              className="flex-1 px-4 pt-3"
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. Danh sách thuốc ĐÃ CHỌN trong đơn này */}
              {prescriptionItems.length > 0 && (
                <Card
                  key="selected-items-card"
                  className="mb-4 p-4 border border-border/80 bg-card rounded-3xl"
                >
                  <View className="flex-row items-center justify-between pb-2.5 mb-1 border-b border-border/40">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="h-7 w-7 rounded-xl bg-primary/10 items-center justify-center mr-2">
                        <Pill size={15} color="#0D9488" strokeWidth={2.2} />
                      </View>
                      <Text className="text-sm font-bold text-foreground flex-1" numberOfLines={1}>
                        Thuốc đã chọn ({prescriptionItems.length})
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={handleOpenNoteView}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(13, 148, 136, 0.12)',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0D9488' }}>
                        Xem phiếu note
                      </Text>
                      <ChevronRight size={13} color="#0D9488" />
                    </TouchableOpacity>
                  </View>

                  {prescriptionItems.map((item, index) => (
                    <View
                      key={item.id}
                      className="flex-row items-center justify-between py-2.5 border-b border-border/30"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <Text className="text-xs font-bold text-primary mr-2">
                          {index + 1}.
                        </Text>
                        {item.image ? (
                          <Image
                            source={{ uri: item.image }}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              backgroundColor: '#F1F5F9',
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                            }}
                            contentFit="contain"
                          />
                        ) : (
                          <View className="h-11 w-11 rounded-xl bg-primary/10 items-center justify-center">
                            <Pill size={20} color="#0D9488" />
                          </View>
                        )}
                        <View className="ml-2.5 flex-1">
                          <Text
                            className="text-sm font-bold text-foreground"
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text
                            className="text-xs text-muted-foreground mt-0.5"
                            numberOfLines={1}
                          >
                            {item.dosageInstruction}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center">
                        <View className="bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                          <Text className="text-xs font-bold text-primary">
                            {item.quantity} {item.unit}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveItem(item.id)}
                          className="ml-2.5 h-8 w-8 rounded-full bg-destructive/10 items-center justify-center"
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={`Xoá ${item.name} khỏi đơn`}
                        >
                          <Trash2 size={15} color="#EF4444" strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </Card>
              )}

              {/* 2. Kho tra cứu thuốc từ chi_thuoc.json */}
              <View
                key="catalog-header"
                className="flex-row items-center justify-between mb-2 ml-1"
              >
                <Text
                  className="text-sm font-bold text-foreground flex-1 mr-2"
                  numberOfLines={1}
                >
                  Tra cứu thuốc từ kho dữ liệu (An Khang)
                </Text>
                <Badge variant="outline" label="Offline sẵn sàng" />
              </View>

              {/* Ô tìm kiếm */}
              <View
                key="catalog-search-bar"
                className="flex-row items-center bg-card border border-border/80 rounded-2xl px-3.5 h-12 mb-2.5"
              >
                <Search size={18} color="#94A3B8" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Gõ tên thuốc, công dụng (ví dụ: Difflam, Kháng viêm...)"
                  placeholderTextColor="#94A3B8"
                  className="flex-1 ml-2.5 text-sm text-foreground"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Bộ lọc thuốc không kê đơn (Rule 04-medical-safety) */}
              <View className="flex-row gap-2 mb-3">
                <Pressable
                  onPress={() => setClassificationFilter('all')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    backgroundColor:
                      classificationFilter === 'all'
                        ? 'rgba(13, 148, 136, 0.12)'
                        : '#FFFFFF',
                    borderColor:
                      classificationFilter === 'all' ? '#0D9488' : '#E2E8F0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color:
                        classificationFilter === 'all' ? '#0D9488' : '#64748B',
                    }}
                  >
                    Tất cả danh mục
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setClassificationFilter('Thuốc không kê đơn')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    backgroundColor:
                      classificationFilter === 'Thuốc không kê đơn'
                        ? 'rgba(13, 148, 136, 0.12)'
                        : '#FFFFFF',
                    borderColor:
                      classificationFilter === 'Thuốc không kê đơn'
                        ? '#0D9488'
                        : '#E2E8F0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color:
                        classificationFilter === 'Thuốc không kê đơn'
                          ? '#0D9488'
                          : '#64748B',
                    }}
                  >
                    Chỉ thuốc không kê đơn (OTC)
                  </Text>
                </Pressable>
              </View>

              {/* Danh sách kết quả tìm kiếm */}
              {searchResults.map((med, index) => {
                const isPrescription = med.classification === 'Thuốc kê đơn';
                return (
                  <Card
                    key={`${med.name}-${index}`}
                    className="mb-2.5 p-3.5 border-border/70"
                  >
                    <View className="flex-row items-center justify-between">
                      {/* Ảnh thuốc */}
                      <View className="flex-row items-center flex-1 mr-2">
                        {med.image ? (
                          <Image
                            source={{ uri: med.image }}
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 16,
                              backgroundColor: '#F8FAFC',
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                            }}
                            contentFit="contain"
                          />
                        ) : (
                          <View className="h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center">
                            <Pill size={24} color="#0D9488" />
                          </View>
                        )}

                        {/* Tên & thông tin */}
                        <View className="ml-3 flex-1">
                          <Text
                            className="text-sm font-bold text-foreground"
                            numberOfLines={2}
                          >
                            {med.name}
                          </Text>
                          <Text
                            className="text-xs text-muted-foreground mt-0.5"
                            numberOfLines={1}
                          >
                            {med.dosage_form || 'Dạng thuốc'}{' '}
                            {med.brand ? `• ${med.brand}` : ''}
                          </Text>
                          {med.short_usage && (
                            <Text
                              className="text-[11px] text-muted-foreground/80 mt-0.5"
                              numberOfLines={1}
                            >
                              {med.short_usage}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Nút Chọn */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 rounded-xl border-primary/40 bg-primary/5"
                        onPress={() => handleSelectMedicine(med)}
                      >
                        <Plus size={14} color="#0D9488" strokeWidth={2.5} />
                        <Text className="text-xs font-bold text-primary ml-1">
                          Chọn
                        </Text>
                      </Button>
                    </View>

                    {isPrescription && (
                      <View className="flex-row items-center mt-1.5 pt-1.5 border-t border-border/30">
                        <AlertCircle size={11} color="#F59E0B" />
                        <Text className="text-[10px] text-amber-600 font-medium ml-1">
                          Thuốc kê đơn - Chỉ dùng khi đã có chỉ định của bác sĩ
                        </Text>
                      </View>
                    )}
                  </Card>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          /* ================= CHẾ ĐỘ 2: GIẤY NOTE MUA THUỐC ĐƠN GIẢN ================= */
          <ScrollView
            key="tab-note-view"
            className="flex-1 px-4 pt-3"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Tờ giấy Note tối giản, rõ ràng để đưa cho dược sĩ ngoài tiệm thuốc */}
            <View
              style={{
                backgroundColor: '#FFFDF7',
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: '#E5E0D0',
                marginBottom: 16,
              }}
            >
              {/* Tiêu đề giấy Note ngắn gọn */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 12,
                  marginBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E0D0',
                  borderStyle: 'dashed',
                }}
              >
                <TextInput
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                  placeholder="Phiếu mua thuốc"
                  placeholderTextColor="#94A3B8"
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#0F172A',
                    flex: 1,
                    padding: 0,
                  }}
                />
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                  {new Date().toLocaleDateString('vi-VN')}
                </Text>
              </View>

              {/* Danh sách thuốc cần mua */}
              {prescriptionItems.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: index === prescriptionItems.length - 1 ? 0 : 1,
                    borderBottomColor: '#EFECE2',
                  }}
                >
                  {/* Ảnh hộp thuốc to rõ để dược sĩ nhìn nhận diện ngay */}
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: 14,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                      }}
                      contentFit="contain"
                    />
                  ) : (
                    <View
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: 14,
                        backgroundColor: 'rgba(13, 148, 136, 0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Pill size={28} color="#0D9488" />
                    </View>
                  )}

                  {/* Tên thuốc, số lượng cần mua & cách dùng */}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: '#0F172A',
                        lineHeight: 20,
                      }}
                    >
                      {index + 1}. {item.name}
                    </Text>

                    {/* Số lượng mua nổi bật */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 6,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: '#0D9488',
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: 13,
                            fontWeight: '800',
                          }}
                        >
                          Mua: {item.quantity} {item.unit}
                        </Text>
                      </View>
                    </View>

                    {item.dosageInstruction ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#475569',
                          marginTop: 5,
                        }}
                      >
                        • {item.dosageInstruction}
                      </Text>
                    ) : null}

                    {item.notes ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#64748B',
                          fontStyle: 'italic',
                          marginTop: 2,
                        }}
                      >
                        • Ghi chú: {item.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}

              {/* Dòng ghi chú tự do dưới cùng giống giấy note */}
              <View
                style={{
                  marginTop: 10,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#E5E0D0',
                }}
              >
                <TextInput
                  value={generalInstructions}
                  onChangeText={setGeneralInstructions}
                  multiline
                  placeholder="Ghi chú thêm (ví dụ: Mua cho bố, lấy đúng hãng này...)"
                  placeholderTextColor="#94A3B8"
                  style={{
                    fontSize: 13,
                    color: '#334155',
                    padding: 0,
                    minHeight: 36,
                  }}
                />
              </View>
            </View>

            {/* Các nút hành động: Chia sẻ nhanh qua Zalo/Tin nhắn & Thêm lịch nhắc */}
            <View className="gap-3 mb-6">
              {/* Nút 1 (Chính): Chia sẻ phiếu cho người khác cầm đi mua */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleShareNote}
                style={{
                  backgroundColor: '#0D9488',
                  height: 54,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Share2 size={20} color="#FFFFFF" strokeWidth={2.2} />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: 16,
                    marginLeft: 8,
                  }}
                >
                  Chia sẻ phiếu (Zalo / Tin nhắn)
                </Text>
              </TouchableOpacity>

              {/* Hàng nút phụ: Thêm thuốc khác hoặc Đồng bộ vào lịch nhắc */}
              <View className="flex-row gap-2.5">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleOpenBuilderView}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#0F172A',
                      fontWeight: '600',
                      fontSize: 14,
                    }}
                  >
                    + Chọn thêm thuốc
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSyncToReminders}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: 'rgba(13, 148, 136, 0.12)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CalendarCheck size={16} color="#0D9488" strokeWidth={2.2} />
                  <Text
                    style={{
                      color: '#0D9488',
                      fontWeight: '700',
                      fontSize: 14,
                      marginLeft: 6,
                    }}
                  >
                    Lưu vào lịch nhắc
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* MODAL: Tùy chỉnh liều lượng và số lượng thuốc */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[85%]">
            {/* Header modal */}
            <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
              <Text className="text-lg font-bold text-foreground">
                Kê số lượng & Liều dùng
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="h-8 w-8 rounded-full bg-muted/60 items-center justify-center"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView className="py-3" showsVerticalScrollIndicator={false}>
              {/* Thông tin thuốc đã chọn */}
              <View className="flex-row items-center mb-3 p-3 bg-muted/30 rounded-2xl border border-border/50">
                {selectedMedicine?.image ? (
                  <Image
                    source={{ uri: selectedMedicine.image }}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                    contentFit="contain"
                  />
                ) : (
                  <View className="h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center">
                    <Pill size={24} color="#0D9488" />
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text
                    className="text-sm font-bold text-foreground"
                    numberOfLines={2}
                  >
                    {selectedMedicine?.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {selectedMedicine?.dosage_form || 'Dạng thuốc'}{' '}
                    {selectedMedicine?.strength
                      ? `• ${selectedMedicine.strength}`
                      : ''}
                  </Text>
                </View>
              </View>

              {selectedMedicine?.classification === 'Thuốc kê đơn' && (
                <View className="flex-row items-center mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <AlertCircle size={15} color="#F59E0B" />
                  <Text className="text-xs text-amber-700 dark:text-amber-300 font-medium ml-2 flex-1">
                    Lưu ý an toàn: Đây là thuốc kê đơn. Chỉ lưu lịch nhắc khi người bệnh đã có toa chỉ định của bác sĩ.
                  </Text>
                </View>
              )}

              {/* Ô nhập số lượng viên/gói */}
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Số lượng cần kê ({unit}):
              </Text>
              <View className="flex-row items-center gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => {
                    const current = parseInt(quantity, 10) || 1;
                    if (current > 1) setQuantity((current - 1).toString());
                  }}
                  className="h-12 w-12 rounded-2xl bg-muted/70 items-center justify-center"
                >
                  <Text className="text-xl font-bold text-foreground">-</Text>
                </TouchableOpacity>

                <Input
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="10"
                  keyboardType="numeric"
                  className="flex-1 text-center font-bold text-lg h-12"
                />

                <TouchableOpacity
                  onPress={() => {
                    const current = parseInt(quantity, 10) || 0;
                    setQuantity((current + 1).toString());
                  }}
                  className="h-12 w-12 rounded-2xl bg-muted/70 items-center justify-center"
                >
                  <Text className="text-xl font-bold text-foreground">+</Text>
                </TouchableOpacity>
              </View>

              {/* Các nút chọn nhanh số lượng */}
              <View className="flex-row gap-2 mb-4">
                {['5', '10', '15', '20', '30'].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => setQuantity(num)}
                    style={{
                      flex: 1,
                      paddingVertical: 6,
                      borderRadius: 12,
                      borderWidth: 1,
                      alignItems: 'center',
                      backgroundColor:
                        quantity === num ? '#0D9488' : '#FFFFFF',
                      borderColor: quantity === num ? '#0D9488' : '#E2E8F0',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: quantity === num ? '#FFFFFF' : '#0F172A',
                      }}
                    >
                      {num} {unit}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Liều lượng & Cách uống */}
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Liều lượng & Cách dùng:
              </Text>
              <Input
                value={dosageInstruction}
                onChangeText={setDosageInstruction}
                placeholder="Ví dụ: Ngày 2 lần, mỗi lần 1 viên sau ăn"
                className="mb-2"
              />

              {/* Gợi ý liều dùng */}
              <View className="flex-row flex-wrap gap-1.5 mb-4">
                {QUICK_DOSAGE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setDosageInstruction(opt)}
                    className="bg-muted/50 px-2.5 py-1 rounded-lg"
                  >
                    <Text className="text-[11px] text-muted-foreground font-medium">
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Số ngày dùng */}
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Dùng trong bao nhiêu ngày:
              </Text>
              <Input
                value={durationDays}
                onChangeText={setDurationDays}
                placeholder="5"
                keyboardType="numeric"
                className="mb-4"
              />

              {/* Ghi chú thêm */}
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Dặn dò thêm cho thuốc này:
              </Text>
              <Input
                value={itemNotes}
                onChangeText={setItemNotes}
                placeholder="Ví dụ: Uống với nhiều nước ấm..."
                className="mb-5"
              />
            </ScrollView>

            {/* Nút hoàn tất thêm */}
            <Button
              variant="default"
              size="lg"
              className="bg-primary w-full h-13 rounded-2xl"
              onPress={handleConfirmAddMedicine}
            >
              <Text className="text-white font-bold text-base">
                Thêm vào đơn thuốc
              </Text>
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
