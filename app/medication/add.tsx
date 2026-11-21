// app/medication/add.tsx
// Màn hình Thêm thuốc mới vào tủ thuốc & đặt lịch nhắc
// Tích hợp: Tìm nhanh từ kho 2.000+ thuốc (có sẵn ảnh), hoặc tự chụp/chọn từ Album,
// và chọn Khung giờ uống thuốc linh hoạt (4 khung giờ nhanh + Thêm giờ tuỳ chỉnh bất kỳ).

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
  Camera,
  Image as ImageIcon,
  X,
  Clock,
  Pill,
  Check,
  Calendar,
  AlertCircle,
  ShoppingBag,
  Search,
  Plus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/context/AppContext';
import { searchMedicines } from '@/services/medicineService';
import type { TreatmentType, CatalogMedicine } from '@/types';

const COURSE_DURATIONS = [
  { label: '1 tháng', months: 1, days: 30 },
  { label: '2 tháng', months: 2, days: 60 },
  { label: '3 tháng', months: 3, days: 90 },
  { label: '6 tháng', months: 6, days: 180 },
];

/**
 * Nén ảnh và loại bỏ siêu dữ liệu EXIF GPS trước khi lưu/hiển thị (Tuân thủ rule 01-security.md)
 */
async function sanitizeAndCompressImage(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
}

function getPeriodLabel(hour: number): string {
  if (hour < 11) return 'Sáng';
  if (hour < 14) return 'Trưa';
  if (hour < 18) return 'Chiều';
  return 'Tối';
}

export default function AddMedicationScreen() {
  const router = useRouter();
  const { addMedication, reminderSettings } = useAppStore();

  // Tìm nhanh từ kho dữ liệu 2.000+ thuốc
  const [catalogQuery, setCatalogQuery] = useState('');
  const catalogSuggestions = useMemo(() => {
    if (!catalogQuery.trim()) return [];
    return searchMedicines(catalogQuery, { limit: 6 });
  }, [catalogQuery]);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');

  // Quản lý liệu trình điều trị
  const [treatmentType, setTreatmentType] = useState<TreatmentType>('course');
  const [selectedMonths, setSelectedMonths] = useState<number>(3);
  const [totalCourseStock, setTotalCourseStock] = useState<string>('90');
  const [purchasedStock, setPurchasedStock] = useState<string>('30');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('5');

  // Danh sách các khung giờ gợi ý nhanh (kết hợp từ cấu hình gia đình + các giờ tuỳ chỉnh người dùng thêm)
  const defaultPresetTimes = useMemo(
    () => [
      `${reminderSettings.morningTime} (Sáng)`,
      `${reminderSettings.noonTime} (Trưa)`,
      `${reminderSettings.afternoonTime} (Chiều)`,
      `${reminderSettings.eveningTime} (Tối)`,
    ],
    [reminderSettings]
  );

  const [customTimeOptions, setCustomTimeOptions] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(() => [
    `${reminderSettings.morningTime} (Sáng)`,
  ]);

  // Modal thêm giờ uống thuốc tuỳ chỉnh tự do
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [customHour, setCustomHour] = useState(8);
  const [customMinute, setCustomMinute] = useState(30);

  const allTimeOptions = useMemo(() => {
    const merged = [...defaultPresetTimes];
    customTimeOptions.forEach((t) => {
      if (!merged.includes(t)) merged.push(t);
    });
    return merged;
  }, [defaultPresetTimes, customTimeOptions]);

  // Chọn 1 thuốc từ kho dữ liệu 2.000+ thuốc -> Tự điền tên, ảnh và gợi ý liều
  const handleSelectCatalogMedicine = (med: CatalogMedicine) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setName(med.name);
    if (med.image) {
      setPhotoUri(med.image);
    }
    if (!dosage.trim()) {
      const form = med.dosage_form || '1 viên';
      setDosage(`${form} - Sau bữa ăn`);
    }
    if (med.short_usage && !notes.trim()) {
      setNotes(med.short_usage);
    }
    setCatalogQuery('');
  };

  // Chọn ảnh từ thư viện
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const cleanUri = await sanitizeAndCompressImage(result.assets[0].uri);
        setPhotoUri(cleanUri);
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể mở thư viện ảnh.');
    }
  };

  // Chụp ảnh từ camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền Camera', 'Vui lòng cấp quyền máy ảnh để chụp ảnh viên thuốc.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const cleanUri = await sanitizeAndCompressImage(result.assets[0].uri);
        setPhotoUri(cleanUri);
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể mở máy ảnh.');
    }
  };

  const toggleTime = (time: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}

    if (selectedTimes.includes(time)) {
      setSelectedTimes((prev) => prev.filter((t) => t !== time));
    } else {
      setSelectedTimes((prev) => [...prev, time]);
    }
  };

  const handleAddCustomTime = () => {
    const timeStr = `${String(customHour).padStart(2, '0')}:${String(customMinute).padStart(
      2,
      '0'
    )} (${getPeriodLabel(customHour)})`;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setCustomTimeOptions((prev) => (prev.includes(timeStr) ? prev : [...prev, timeStr]));
    setSelectedTimes((prev) => (prev.includes(timeStr) ? prev : [...prev, timeStr]));
    setTimePickerVisible(false);
  };

  const selectDuration = (months: number, days: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedMonths(months);
    setTotalCourseStock(days.toString());
  };

  const totalNum = parseInt(totalCourseStock, 10) || 0;
  const currentNum = parseInt(purchasedStock, 10) || 0;
  const thresholdNum = parseInt(lowStockThreshold, 10) || 5;
  const remainingNeeded = Math.max(0, totalNum - currentNum);
  const progressPercent = totalNum > 0 ? Math.min(100, Math.round((currentNum / totalNum) * 100)) : 0;

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Chưa đủ thông tin', 'Vui lòng nhập tên thuốc hoặc chọn từ kho thuốc.');
      return;
    }

    if (selectedTimes.length === 0) {
      Alert.alert('Chưa chọn giờ uống', 'Vui lòng chọn ít nhất một khung giờ uống thuốc trong ngày.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    addMedication({
      name: name.trim(),
      dosage: dosage.trim() || '1 viên - Sau ăn',
      notes: notes.trim(),
      image: photoUri,
      treatmentType,
      courseDurationMonths: selectedMonths,
      totalCourseStock: totalNum,
      stock: currentNum,
      lowStockThreshold: thresholdNum,
      selectedTimes,
    });

    Alert.alert(
      'Thành công',
      `Đã thêm "${name.trim()}" vào tủ thuốc và đặt lịch nhắc.\nHiện có: ${currentNum} viên ${
        treatmentType === 'course' ? `(Cả liệu trình: ${totalNum} viên)` : ''
      }.`,
      [{ text: 'Xong', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/50">
        <Text className="text-xl font-bold text-foreground">Thêm thuốc mới</Text>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-muted/60"
          onPress={() => router.back()}
          accessibilityLabel="Đóng màn hình thêm thuốc"
        >
          <X size={20} color="#64748B" />
        </Button>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 0. TÌM NHANH TỪ KHO 2.000+ THUỐC ĐỂ TỰ ĐỘNG ĐIỀN TÊN & ẢNH */}
        <Card className="mb-5 p-4 border-primary/30 bg-card">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-bold text-foreground">
              Tìm nhanh từ kho 2,000+ thuốc (Có sẵn ảnh)
            </Text>
            <Badge variant="default" label="Tự điền" />
          </View>
          <View className="flex-row items-center bg-muted/50 border border-border rounded-2xl px-3.5 h-11">
            <Search size={17} color="#0D9488" />
            <TextInput
              value={catalogQuery}
              onChangeText={setCatalogQuery}
              placeholder="Gõ tên thuốc để lấy ảnh & thông tin (vd: Panadol, Oxy...)"
              placeholderTextColor="#94A3B8"
              className="flex-1 ml-2 text-sm text-foreground"
            />
            {catalogQuery.length > 0 && (
              <TouchableOpacity onPress={() => setCatalogQuery('')}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Danh sách gợi ý từ kho thuốc */}
          {catalogSuggestions.length > 0 && (
            <View className="mt-3 pt-2 border-t border-border/50">
              {catalogSuggestions.map((med, idx) => (
                <TouchableOpacity
                  key={`${med.name}-${idx}`}
                  activeOpacity={0.75}
                  onPress={() => handleSelectCatalogMedicine(med)}
                  className="flex-row items-center justify-between py-2 border-b border-border/30"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    {med.image ? (
                      <Image
                        source={{ uri: med.image }}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                        contentFit="contain"
                      />
                    ) : (
                      <View className="h-11 w-11 rounded-xl bg-primary/10 items-center justify-center">
                        <Pill size={18} color="#0D9488" />
                      </View>
                    )}
                    <View className="ml-2.5 flex-1">
                      <Text className="text-xs font-bold text-foreground" numberOfLines={2}>
                        {med.name}
                      </Text>
                      <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                        {med.dosage_form || 'Thuốc'} {med.brand ? `• ${med.brand}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-primary/10 px-2.5 py-1 rounded-lg">
                    <Text className="text-xs font-bold text-primary">Chọn</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* 1. Khu vực chụp ảnh viên thuốc hoặc lấy từ Album (nếu không có trong kho) */}
        <Card className="mb-5 p-4 border-dashed border-2 border-border/80 items-center justify-center">
          {photoUri ? (
            <View className="items-center">
              <Image
                source={{ uri: photoUri }}
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: 24,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  backgroundColor: '#FFFFFF',
                }}
                contentFit="contain"
              />
              <View className="flex-row gap-2">
                <Button variant="outline" size="sm" onPress={handleTakePhoto}>
                  <Text className="text-xs text-foreground">Chụp ảnh khác</Text>
                </Button>
                <Button variant="outline" size="sm" onPress={handlePickImage}>
                  <Text className="text-xs text-foreground">Chọn từ Album</Text>
                </Button>
                <Button variant="ghost" size="sm" onPress={() => setPhotoUri(null)}>
                  <Text className="text-xs text-destructive">Xoá</Text>
                </Button>
              </View>
            </View>
          ) : (
            <View className="items-center py-3">
              <View className="h-14 w-14 rounded-full bg-primary/10 items-center justify-center mb-2.5">
                <Pill size={28} color="#0D9488" strokeWidth={1.8} />
              </View>
              <Text className="text-base font-semibold text-foreground">
                Ảnh viên thuốc / Hộp thuốc
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5 text-center px-4">
                Nếu thuốc không có trong kho tìm kiếm ở trên, bạn có thể tự chụp hoặc lấy từ Album
              </Text>

              <View className="flex-row gap-3 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-row items-center rounded-xl"
                  onPress={handleTakePhoto}
                >
                  <Camera size={16} color="#0D9488" />
                  <Text className="text-xs font-semibold text-foreground ml-1.5">
                    Chụp ảnh
                  </Text>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex-row items-center rounded-xl"
                  onPress={handlePickImage}
                >
                  <ImageIcon size={16} color="#0D9488" />
                  <Text className="text-xs font-semibold text-foreground ml-1.5">
                    Chọn từ Album
                  </Text>
                </Button>
              </View>
            </View>
          )}
        </Card>

        {/* 2. Thông tin cơ bản */}
        <Card className="mb-5 p-4 border-border/80">
          <Text className="text-sm font-semibold text-foreground mb-1.5">
            Tên thuốc *
          </Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Ví dụ: Glucophage (Tiểu đường), Panadol..."
            className="mb-4"
          />

          <Text className="text-sm font-semibold text-foreground mb-1.5">
            Liều lượng & Cách dùng
          </Text>
          <Input
            value={dosage}
            onChangeText={setDosage}
            placeholder="Ví dụ: 1 viên (500mg) - Sau bữa ăn"
            className="mb-4"
          />

          <Text className="text-sm font-semibold text-foreground mb-1.5">
            Ghi chú thêm
          </Text>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Ví dụ: Uống kèm nhiều nước..."
          />
        </Card>

        {/* 3. Thời gian điều trị & Liệu trình */}
        <Card className="mb-5 p-4 border-border/80">
          <View className="flex-row items-center mb-2.5">
            <Calendar size={18} color="#0D9488" />
            <Text className="text-base font-semibold text-foreground ml-2">
              Thời gian sử dụng
            </Text>
          </View>

          {/* Chọn loại: Theo đợt / Dài hạn */}
          <View className="flex-row bg-muted/60 p-1 rounded-2xl mb-4">
            <TouchableOpacity
              onPress={() => setTreatmentType('course')}
              className={`flex-1 py-2.5 rounded-xl items-center ${
                treatmentType === 'course' ? 'bg-card' : ''
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  treatmentType === 'course' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Theo đợt điều trị
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTreatmentType('ongoing')}
              className={`flex-1 py-2.5 rounded-xl items-center ${
                treatmentType === 'ongoing' ? 'bg-card' : ''
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  treatmentType === 'ongoing' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Dài hạn (mãn tính)
              </Text>
            </TouchableOpacity>
          </View>

          {treatmentType === 'course' && (
            <View>
              <Text className="text-xs text-muted-foreground mb-2">
                Chọn thời gian điều trị theo chỉ định:
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {COURSE_DURATIONS.map((dur) => {
                  const isSelected = selectedMonths === dur.months;
                  return (
                    <TouchableOpacity
                      key={dur.months}
                      onPress={() => selectDuration(dur.months, dur.days)}
                      className={`px-3 py-2 rounded-xl border flex-row items-center ${
                        isSelected ? 'bg-primary/10 border-primary' : 'bg-card border-border'
                      }`}
                    >
                      {isSelected && <Check size={14} color="#0D9488" className="mr-1" />}
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {dur.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-sm font-semibold text-foreground mb-1.5">
                Tổng số viên cho cả liệu trình
              </Text>
              <Input
                value={totalCourseStock}
                onChangeText={setTotalCourseStock}
                placeholder="90"
                keyboardType="numeric"
                className="mb-2"
              />
            </View>
          )}
        </Card>

        {/* 4. Quản lý số lượng thuốc & Mua theo đợt linh hoạt */}
        <Card className="mb-5 p-4 border-border/80">
          <View className="flex-row items-center mb-1.5">
            <ShoppingBag size={18} color="#0D9488" />
            <Text className="text-base font-semibold text-foreground ml-2">
              Quản lý số lượng & Mua thuốc
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Thuốc điều trị nhiều tháng có thể tốn kém. Bạn có thể mua trước 1 phần (ví dụ mua 30 viên), ứng dụng sẽ tự tính toán và nhắc bạn khi đợt này sắp hết.
          </Text>

          <Text className="text-sm font-semibold text-foreground mb-1.5">
            Số viên đã mua sẵn hiện tại *
          </Text>
          <Input
            value={purchasedStock}
            onChangeText={setPurchasedStock}
            placeholder="30"
            keyboardType="numeric"
            className="mb-4"
          />

          <Text className="text-sm font-semibold text-foreground mb-1.5">
            Báo động khi thuốc trong tủ còn dưới (viên)
          </Text>
          <Input
            value={lowStockThreshold}
            onChangeText={setLowStockThreshold}
            placeholder="5"
            keyboardType="numeric"
            className="mb-4"
          />

          {/* Khung tổng quan tiến độ mua thuốc */}
          {treatmentType === 'course' && totalNum > 0 && (
            <View className="bg-muted/40 p-3.5 rounded-2xl border border-border/60">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold text-foreground">
                  Tiến độ mua cả liệu trình:
                </Text>
                <Badge
                  variant={currentNum >= totalNum ? 'success' : 'warning'}
                  label={`${currentNum} / ${totalNum} viên`}
                />
              </View>

              {/* Progress bar */}
              <View className="w-full h-2 bg-muted rounded-full mt-2.5 overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>

              {remainingNeeded > 0 ? (
                <View className="flex-row items-center mt-2.5">
                  <AlertCircle size={14} color="#F59E0B" />
                  <Text className="text-xs text-amber-700 dark:text-amber-400 font-medium ml-1.5 flex-1">
                    Đợt này mua {currentNum} viên. Còn thiếu {remainingNeeded} viên để hoàn tất {selectedMonths} tháng điều trị.
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center mt-2.5">
                  <Check size={14} color="#10B981" />
                  <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-1.5 flex-1">
                    Đã chuẩn bị đủ toàn bộ thuốc cho liệu trình!
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* 5. KHUNG GIỜ UỐNG THUỐC LINH HOẠT (Gợi ý nhanh + Chọn giờ tuỳ chỉnh thoải mái) */}
        <Card className="mb-6 p-4 border-border/80">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Clock size={18} color="#0D9488" />
              <Text className="text-base font-semibold text-foreground ml-2">
                Khung giờ uống thuốc
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setTimePickerVisible(true)}
              className="flex-row items-center bg-primary/10 px-2.5 py-1 rounded-full"
            >
              <Plus size={13} color="#0D9488" strokeWidth={2.5} />
              <Text className="text-xs font-bold text-primary ml-1">Thêm giờ khác</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-muted-foreground mb-3">
            Chọn nhanh khung giờ gợi ý hoặc bấm &ldquo;+ Thêm giờ khác&rdquo; để đặt giờ bất kỳ:
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {allTimeOptions.map((time) => {
              const isSelected = selectedTimes.includes(time);
              return (
                <TouchableOpacity
                  key={time}
                  onPress={() => toggleTime(time)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isSelected ? '#0D9488' : '#FFFFFF',
                    borderColor: isSelected ? '#0D9488' : '#E2E8F0',
                  }}
                >
                  {isSelected && (
                    <Check size={14} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 5 }} />
                  )}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? '#FFFFFF' : '#0F172A',
                    }}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Nút thêm giờ tuỳ chỉnh trực tiếp */}
            <TouchableOpacity
              onPress={() => setTimePickerVisible(true)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#0D9488',
                backgroundColor: 'rgba(13, 148, 136, 0.05)',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Plus size={14} color="#0D9488" strokeWidth={2.5} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#0D9488',
                  marginLeft: 4,
                }}
              >
                Chọn giờ tuỳ ý
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Nút Lưu */}
        <Button
          variant="default"
          size="lg"
          className="bg-primary w-full h-14 rounded-2xl"
          onPress={handleSave}
        >
          <Text className="text-white font-bold text-base">
            Lưu vào tủ thuốc
          </Text>
        </Button>
      </ScrollView>

      {/* MODAL CHỌN GIỜ UỐNG THUỐC TUỲ CHỈNH TỰ DO */}
      <Modal
        visible={timePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <Card className="w-full max-w-sm p-5 border-border bg-card">
            <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
              <Text className="text-base font-bold text-foreground">
                Thêm khung giờ uống thuốc
              </Text>
              <TouchableOpacity
                onPress={() => setTimePickerVisible(false)}
                className="h-8 w-8 rounded-full bg-muted/60 items-center justify-center"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-center my-6 gap-4">
              {/* Cột Giờ */}
              <View className="items-center">
                <TouchableOpacity
                  onPress={() => setCustomHour((h) => (h + 1) % 24)}
                  className="h-10 w-16 rounded-xl bg-muted/70 items-center justify-center mb-2"
                >
                  <Text className="text-lg font-bold text-foreground">+</Text>
                </TouchableOpacity>
                <View className="h-16 w-20 rounded-2xl bg-primary/10 border border-primary/30 items-center justify-center">
                  <Text className="text-3xl font-extrabold text-primary">
                    {String(customHour).padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCustomHour((h) => (h - 1 + 24) % 24)}
                  className="h-10 w-16 rounded-xl bg-muted/70 items-center justify-center mt-2"
                >
                  <Text className="text-lg font-bold text-foreground">-</Text>
                </TouchableOpacity>
                <Text className="text-xs text-muted-foreground mt-1">Giờ</Text>
              </View>

              <Text className="text-3xl font-extrabold text-foreground pb-5">:</Text>

              {/* Cột Phút */}
              <View className="items-center">
                <TouchableOpacity
                  onPress={() => setCustomMinute((m) => (m + 5) % 60)}
                  className="h-10 w-16 rounded-xl bg-muted/70 items-center justify-center mb-2"
                >
                  <Text className="text-lg font-bold text-foreground">+5</Text>
                </TouchableOpacity>
                <View className="h-16 w-20 rounded-2xl bg-primary/10 border border-primary/30 items-center justify-center">
                  <Text className="text-3xl font-extrabold text-primary">
                    {String(customMinute).padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCustomMinute((m) => (m - 5 + 60) % 60)}
                  className="h-10 w-16 rounded-xl bg-muted/70 items-center justify-center mt-2"
                >
                  <Text className="text-lg font-bold text-foreground">-5</Text>
                </TouchableOpacity>
                <Text className="text-xs text-muted-foreground mt-1">Phút</Text>
              </View>
            </View>

            {/* Chọn nhanh phút 00, 15, 30, 45 */}
            <View className="flex-row gap-2 mb-5">
              {[0, 15, 30, 45].map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setCustomMinute(m)}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 10,
                    borderWidth: 1,
                    alignItems: 'center',
                    backgroundColor: customMinute === m ? '#0D9488' : '#FFFFFF',
                    borderColor: customMinute === m ? '#0D9488' : '#E2E8F0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: customMinute === m ? '#FFFFFF' : '#0F172A',
                    }}
                  >
                    :{String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onPress={() => setTimePickerVisible(false)}
              >
                <Text className="text-sm text-muted-foreground">Huỷ</Text>
              </Button>
              <Button
                variant="default"
                className="flex-1 bg-primary h-11 rounded-xl"
                onPress={handleAddCustomTime}
              >
                <Text className="text-sm font-bold text-white">Thêm giờ này</Text>
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
