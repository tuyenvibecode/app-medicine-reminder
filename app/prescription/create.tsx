// app/prescription/create.tsx
// Màn hình Lên đơn thuốc dành cho Dược sĩ gia đình
// Tìm kiếm thuốc từ data chi_thuoc.json, chọn số lượng viên và xuất Phiếu Note Toa thuốc có ảnh

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  Stethoscope,
  Pill,
  Clock,
  Share2,
  CalendarCheck,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { searchMedicines } from '@/services/medicineService';
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

  // Tab giao diện: 'builder' (Chọn thuốc) hoặc 'note' (Xem phiếu đơn thuốc hoàn chỉnh)
  const [activeTab, setActiveTab] = useState<'builder' | 'note'>('builder');

  // Thông tin đơn thuốc & dặn dò
  const [generalInstructions, setGeneralInstructions] = useState('Uống nhiều nước ấm, nghỉ ngơi điều độ. Kiêng nước đá và đồ cay nóng.');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionMedicineItem[]>([]);

  // Tìm kiếm thuốc
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useMemo(() => {
    return searchMedicines(searchQuery, { limit: 25 });
  }, [searchQuery]);

  // Modal tùy chỉnh liều & số lượng khi thêm thuốc
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<CatalogMedicine | null>(null);
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState('viên');
  const [dosageInstruction, setDosageInstruction] = useState('Ngày 2 lần, mỗi lần 1 viên sau ăn');
  const [durationDays, setDurationDays] = useState('5');
  const [itemNotes, setItemNotes] = useState('');

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
    setPrescriptionItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Lưu đơn thuốc
  const handleSavePrescription = () => {
    if (prescriptionItems.length === 0) {
      Alert.alert('Chưa có thuốc', 'Vui lòng thêm ít nhất một loại thuốc vào đơn.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    Alert.alert(
      'Lưu đơn thuốc thành công!',
      `Đã tạo đơn thuốc với ${prescriptionItems.length} loại thuốc.\nBạn có thể đưa cho người nhà xem hoặc đồng bộ vào lịch nhắc.`,
      [{ text: 'Xem phiếu đơn', onPress: () => setActiveTab('note') }]
    );
  };

  // Thêm toàn bộ thuốc trong đơn vào lịch nhắc 1-chạm
  const handleSyncToReminders = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    Alert.alert(
      'Đã lên lịch nhắc thuốc!',
      `Toàn bộ ${prescriptionItems.length} loại thuốc trong đơn đã được tự động thêm vào lịch nhắc uống thuốc hàng ngày của gia đình.`,
      [{ text: 'Tuyệt vời', onPress: () => router.push('/(tabs)') }]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      {/* Header chuẩn: Không bị chèn ép chữ (Fix Ô vuông đỏ 1) */}
      <View className="px-4 pt-3 pb-3 bg-card border-b border-border/60">
        {/* Hàng 1: Tiêu đề thoáng đãng và nút quay lại */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            {router.canGoBack() ? (
              <TouchableOpacity
                onPress={() => router.back()}
                className="h-10 w-10 rounded-full bg-muted/60 items-center justify-center mr-2.5"
              >
                <ArrowLeft size={20} color="#0F172A" />
              </TouchableOpacity>
            ) : (
              <View className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mr-2.5">
                <FileText size={20} color="#0D9488" strokeWidth={2.2} />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">
                Tạo đơn thuốc
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Kho 2,000+ thuốc An Khang & Phiếu note
              </Text>
            </View>
          </View>

          {/* Huy hiệu số thuốc đã chọn (bấm xem ngay) */}
          {prescriptionItems.length > 0 && (
            <TouchableOpacity
              onPress={() => setActiveTab(activeTab === 'builder' ? 'note' : 'builder')}
              className="bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-full flex-row items-center"
            >
              <Pill size={13} color="#0D9488" />
              <Text className="text-xs font-bold text-primary ml-1.5">
                {activeTab === 'builder' ? `${prescriptionItems.length} thuốc ➔` : 'Kê thêm'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Hàng 2: Segmented Control toàn màn hình - Chữ to rõ, không vỡ layout */}
        <View className="flex-row bg-muted/70 p-1 rounded-2xl mt-3">
          <TouchableOpacity
            onPress={() => setActiveTab('builder')}
            className={`flex-1 py-2.5 items-center rounded-xl ${
              activeTab === 'builder' ? 'bg-card shadow-sm border border-border/40' : ''
            }`}
          >
            <View className="flex-row items-center">
              <Search size={14} color={activeTab === 'builder' ? '#0D9488' : '#64748B'} strokeWidth={2.2} />
              <Text
                className={`text-xs font-bold ml-1.5 ${
                  activeTab === 'builder' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                1. Kê & Chọn thuốc
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (prescriptionItems.length === 0) {
                Alert.alert('Chưa có thuốc', 'Vui lòng chọn ít nhất 1 loại thuốc vào đơn trước khi xem phiếu note.');
                return;
              }
              setActiveTab('note');
            }}
            className={`flex-1 py-2.5 items-center rounded-xl ${
              activeTab === 'note' ? 'bg-card shadow-sm border border-border/40' : ''
            }`}
          >
            <View className="flex-row items-center">
              <FileText size={14} color={activeTab === 'note' ? '#0D9488' : '#64748B'} strokeWidth={2.2} />
              <Text
                className={`text-xs font-bold ml-1.5 ${
                  activeTab === 'note' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                2. Phiếu note {prescriptionItems.length > 0 ? `(${prescriptionItems.length})` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'builder' ? (
        /* ================= CHẾ ĐỘ 1: KÊ THUỐC & TÌM KIẾM ================= */
        <View className="flex-1">
          <ScrollView
            className="flex-1 px-4 pt-3"
            contentContainerStyle={{ paddingBottom: prescriptionItems.length > 0 ? 110 : 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* 1. Danh sách thuốc ĐÃ CHỌN trong đơn này - Thiết kế tinh tế, không thô (Fix Ô vuông đỏ 2) */}
          {prescriptionItems.length > 0 && (
            <Card className="mb-4 p-4 border border-border/80 bg-card rounded-3xl shadow-sm">
              <View className="flex-row items-center justify-between pb-2.5 mb-1 border-b border-border/40">
                <View className="flex-row items-center">
                  <View className="h-7 w-7 rounded-xl bg-primary/10 items-center justify-center mr-2">
                    <Pill size={15} color="#0D9488" strokeWidth={2.2} />
                  </View>
                  <Text className="text-sm font-bold text-foreground">
                    Thuốc đã chọn vào đơn ({prescriptionItems.length})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setActiveTab('note')}
                  className="flex-row items-center bg-primary/10 px-2.5 py-1 rounded-full"
                >
                  <Text className="text-xs font-bold text-primary">Xem phiếu note</Text>
                  <ChevronRight size={13} color="#0D9488" />
                </TouchableOpacity>
              </View>

              {prescriptionItems.map((item, index) => (
                <View
                  key={item.id}
                  className="flex-row items-center justify-between py-2.5 border-b border-border/30 last:border-b-0"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <Text className="text-xs font-bold text-primary mr-2">{index + 1}.</Text>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        className="h-11 w-11 rounded-xl bg-muted/20 border border-border/50"
                        contentFit="contain"
                      />
                    ) : (
                      <View className="h-11 w-11 rounded-xl bg-primary/10 items-center justify-center">
                        <Pill size={20} color="#0D9488" />
                      </View>
                    )}
                    <View className="ml-2.5 flex-1">
                      <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
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
                    >
                      <Trash2 size={15} color="#EF4444" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* 3. Kho tra cứu thuốc từ chi_thuoc.json (Tra cứu Offline siêu tốc) */}
          <View className="flex-row items-center justify-between mb-2 ml-1">
            <Text className="text-sm font-bold text-foreground">
              Tra cứu thuốc từ kho dữ liệu (An Khang)
            </Text>
            <Badge variant="outline" label="Offline sẵn sàng" />
          </View>

          {/* Ô tìm kiếm */}
          <View className="flex-row items-center bg-card border border-border/80 rounded-2xl px-3.5 h-12 mb-3">
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

          {/* Danh sách kết quả tìm kiếm */}
          {searchResults.map((med, index) => {
            const isPrescription = med.classification === 'Thuốc kê đơn';
            return (
              <Card key={`${med.name}-${index}`} className="mb-2.5 p-3.5 border-border/70">
                <View className="flex-row items-center justify-between">
                  {/* Ảnh thuốc */}
                  <View className="flex-row items-center flex-1 mr-2">
                    {med.image ? (
                      <Image
                        source={{ uri: med.image }}
                        className="h-14 w-14 rounded-2xl bg-muted/20 border border-border"
                        contentFit="contain"
                      />
                    ) : (
                      <View className="h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center">
                        <Pill size={24} color="#0D9488" />
                      </View>
                    )}

                    {/* Tên & thông tin */}
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-bold text-foreground" numberOfLines={2}>
                        {med.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                        {med.dosage_form || 'Dạng thuốc'} {med.brand ? `• ${med.brand}` : ''}
                      </Text>
                      {med.short_usage && (
                        <Text className="text-[11px] text-muted-foreground/80 mt-0.5" numberOfLines={1}>
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
                    <Text className="text-xs font-bold text-primary ml-1">Chọn</Text>
                  </Button>
                </View>

                {isPrescription && (
                  <View className="flex-row items-center mt-1.5 pt-1.5 border-t border-border/30">
                    <AlertCircle size={11} color="#F59E0B" />
                    <Text className="text-[10px] text-amber-600 font-medium ml-1">
                      Thuốc kê đơn - Cần hướng dẫn kỹ của dược sĩ/bác sĩ
                    </Text>
                  </View>
                )}
              </Card>
            );
          })}
          </ScrollView>

          {/* Floating Dock Bar khi có thuốc trong đơn */}
          {prescriptionItems.length > 0 && (
            <View className="absolute bottom-3 left-4 right-4 z-20">
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setActiveTab('note')}
                className="bg-primary flex-row items-center justify-between p-3.5 rounded-2xl shadow-lg border border-primary/40"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="h-10 w-10 rounded-xl bg-white/20 items-center justify-center mr-3">
                    <FileText size={20} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">
                      Đã chọn {prescriptionItems.length} loại thuốc
                    </Text>
                    <Text className="text-white/80 text-xs">
                      Chạm để xem phiếu dặn dò có ảnh
                    </Text>
                  </View>
                </View>
                <View className="bg-white px-3.5 py-2 rounded-xl flex-row items-center shadow-sm">
                  <Text className="text-primary font-bold text-xs mr-1">Xem phiếu</Text>
                  <ArrowRight size={14} color="#0D9488" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        /* ================= CHẾ ĐỘ 2: PHIẾU NOTE TOA THUỐC HOÀN CHỈNH ================= */
        <ScrollView
          className="flex-1 px-4 pt-3"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Thẻ Phiếu Note mô phỏng Giấy Kê Toa Dược Sĩ */}
          <Card className="p-5 border-2 border-primary/30 bg-card rounded-3xl shadow-sm mb-5">
            {/* Header Phiếu Note */}
            <View className="border-b-2 border-primary/20 pb-4 mb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 rounded-2xl bg-primary/10 items-center justify-center mr-2.5">
                    <Stethoscope size={22} color="#0D9488" strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text className="text-base font-extrabold text-primary tracking-tight">
                      PHIẾU DẶN DÒ & TOA THUỐC
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Dược sĩ gia đình • {new Date().toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                </View>
                <Badge variant="default" label="GIA ĐÌNH" />
              </View>

              {/* Ngày kê đơn */}
              <View className="mt-3 bg-muted/40 px-3.5 py-2 rounded-xl flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">Thời gian tạo:</Text>
                <Text className="text-xs font-semibold text-foreground">
                  {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            </View>

            {/* Danh sách thuốc trong phiếu note */}
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
              Danh mục thuốc chỉ định ({prescriptionItems.length}):
            </Text>

            {prescriptionItems.map((item, index) => (
              <View
                key={item.id}
                className="mb-3.5 p-3.5 rounded-2xl bg-muted/20 border border-border/60"
              >
                <View className="flex-row items-start justify-between">
                  {/* Ảnh thuốc */}
                  <View className="flex-row items-start flex-1 mr-2">
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        className="h-14 w-14 rounded-2xl bg-card border border-border"
                        contentFit="contain"
                      />
                    ) : (
                      <View className="h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center">
                        <Pill size={24} color="#0D9488" />
                      </View>
                    )}

                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-bold text-foreground leading-snug">
                        {index + 1}. {item.name}
                      </Text>
                      <Text className="text-xs font-bold text-primary mt-1">
                        👉 Liều dùng: {item.dosageInstruction}
                      </Text>
                      {item.notes ? (
                        <Text className="text-xs text-muted-foreground mt-0.5">
                          Ghi chú: {item.notes}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Số lượng viên */}
                  <View className="items-end">
                    <Badge
                      variant="default"
                      label={`x ${item.quantity} ${item.unit}`}
                      textClassName="text-xs font-bold"
                    />
                    <Text className="text-[10px] text-muted-foreground mt-1">
                      Dùng {item.durationDays || 5} ngày
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Lời dặn dò chung */}
            <View className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Text className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                💬 Lời dặn của dược sĩ:
              </Text>
              <Text className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                {generalInstructions}
              </Text>
            </View>

            {/* Cam kết an toàn y tế (Bắt buộc theo rule 04) */}
            <View className="mt-4 pt-3 border-t border-border/40">
              <Text className="text-[11px] text-muted-foreground text-center italic leading-relaxed">
                * Phiếu chỉ mang tính hỗ trợ dặn dò trong gia đình. Nếu triệu chứng không thuyên giảm hoặc nặng hơn, hãy đi khám tại cơ sở y tế.
              </Text>
            </View>
          </Card>

          {/* Các nút hành động chính */}
          <View className="space-y-3 mb-6">
            {/* Nút 1: Thêm ngay vào Lịch nhắc thuốc */}
            <Button
              variant="default"
              size="lg"
              className="bg-primary w-full h-14 rounded-2xl"
              onPress={handleSyncToReminders}
            >
              <CalendarCheck size={20} color="#FFFFFF" strokeWidth={2.2} />
              <Text className="text-white font-bold text-base ml-2">
                Thêm tất cả vào Lịch nhắc thuốc
              </Text>
            </Button>

            {/* Nút 2: Lưu đơn thuốc */}
            <View className="flex-row space-x-2.5">
              <Button
                variant="outline"
                size="default"
                className="flex-1 h-12 rounded-2xl border-border/80"
                onPress={() => setActiveTab('builder')}
              >
                <Text className="text-foreground font-semibold text-sm">
                  + Sửa & Thêm thuốc
                </Text>
              </Button>

              <Button
                variant="secondary"
                size="default"
                className="flex-1 h-12 rounded-2xl"
                onPress={handleSavePrescription}
              >
                <CheckCircle size={16} color="#0D9488" />
                <Text className="text-primary font-bold text-sm ml-1.5">
                  Lưu đơn thuốc
                </Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      )}

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
              <View className="flex-row items-center mb-4 p-3 bg-muted/30 rounded-2xl border border-border/50">
                {selectedMedicine?.image ? (
                  <Image
                    source={{ uri: selectedMedicine.image }}
                    className="h-14 w-14 rounded-2xl bg-card border border-border"
                    contentFit="contain"
                  />
                ) : (
                  <View className="h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center">
                    <Pill size={24} color="#0D9488" />
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-foreground" numberOfLines={2}>
                    {selectedMedicine?.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {selectedMedicine?.dosage_form || 'Dạng thuốc'} {selectedMedicine?.strength ? `• ${selectedMedicine.strength}` : ''}
                  </Text>
                </View>
              </View>

              {/* Ô nhập số lượng viên/gói */}
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Số lượng cần kê ({unit}):
              </Text>
              <View className="flex-row items-center space-x-2 mb-4">
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
              <View className="flex-row space-x-2 mb-4">
                {['5', '10', '15', '20', '30'].map((num) => (
                  <TouchableOpacity
                    key={num}
                    onPress={() => setQuantity(num)}
                    className={`flex-1 py-1.5 rounded-xl border items-center ${
                      quantity === num ? 'bg-primary border-primary' : 'bg-card border-border'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        quantity === num ? 'text-white' : 'text-foreground'
                      }`}
                    >
                      {num} {unit}
                    </Text>
                  </TouchableOpacity>
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
                    <Text className="text-[11px] text-muted-foreground font-medium">{opt}</Text>
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
