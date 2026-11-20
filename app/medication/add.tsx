// app/medication/add.tsx
// Màn hình Thêm thuốc mới vào tủ thuốc & đặt lịch nhắc
// Hỗ trợ liệu trình điều trị dài hạn & quản lý số lượng mua theo đợt linh hoạt

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TreatmentType } from '@/types';

const QUICK_TIMES = ['07:30 (Sáng)', '12:00 (Trưa)', '18:30 (Chiều)', '21:00 (Tối)'];
const COURSE_DURATIONS = [
  { label: '1 tháng', months: 1, days: 30 },
  { label: '2 tháng', months: 2, days: 60 },
  { label: '3 tháng', months: 3, days: 90 },
  { label: '6 tháng', months: 6, days: 180 },
];

export default function AddMedicationScreen() {
  const router = useRouter();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');

  // Quản lý liệu trình điều trị
  const [treatmentType, setTreatmentType] = useState<TreatmentType>('course');
  const [selectedMonths, setSelectedMonths] = useState<number>(3); // Mặc định ví dụ 3 tháng
  const [totalCourseStock, setTotalCourseStock] = useState<string>('90'); // 3 tháng x 30 viên = 90 viên
  const [purchasedStock, setPurchasedStock] = useState<string>('30'); // Mua trước 1 tháng = 30 viên
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('5'); // Báo khi còn 5 viên

  const [selectedTimes, setSelectedTimes] = useState<string[]>(['07:30 (Sáng)']);

  // Chọn ảnh từ thư viện
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
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
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
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

  const selectDuration = (months: number, days: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedMonths(months);
    // Tự động tính số viên (ước tính 1 viên/ngày)
    setTotalCourseStock(days.toString());
  };

  const totalNum = parseInt(totalCourseStock, 10) || 0;
  const currentNum = parseInt(purchasedStock, 10) || 0;
  const remainingNeeded = Math.max(0, totalNum - currentNum);
  const progressPercent = totalNum > 0 ? Math.min(100, Math.round((currentNum / totalNum) * 100)) : 0;

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Chưa đủ thông tin', 'Vui lòng nhập tên thuốc.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    Alert.alert(
      'Thành công',
      `Đã thêm "${name}" vào tủ thuốc.\nHiện có: ${currentNum} viên ${
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
        >
          <X size={20} color="#64748B" />
        </Button>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Khu vực chụp ảnh viên thuốc (Hero visual) */}
        <Card className="mb-5 p-4 border-dashed border-2 border-border/80 items-center justify-center">
          {photoUri ? (
            <View className="items-center">
              <Image
                source={{ uri: photoUri }}
                className="h-32 w-32 rounded-3xl mb-3 border border-border"
              />
              <View className="flex-row space-x-2">
                <Button variant="outline" size="sm" onPress={handlePickImage}>
                  <Text className="text-xs text-foreground">Đổi ảnh</Text>
                </Button>
                <Button variant="ghost" size="sm" onPress={() => setPhotoUri(null)}>
                  <Text className="text-xs text-destructive">Xoá</Text>
                </Button>
              </View>
            </View>
          ) : (
            <View className="items-center py-4">
              <View className="h-16 w-16 rounded-full bg-primary/10 items-center justify-center mb-3">
                <Pill size={32} color="#0D9488" strokeWidth={1.8} />
              </View>
              <Text className="text-base font-semibold text-foreground">
                Ảnh viên thuốc
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5 text-center px-4">
                Chụp ảnh rõ viên thuốc để nhận diện dễ dàng lúc chuông reo
              </Text>

              <View className="flex-row space-x-3 mt-4">
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
                    Chọn từ máy
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
                treatmentType === 'course' ? 'bg-card shadow-sm' : ''
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
                treatmentType === 'ongoing' ? 'bg-card shadow-sm' : ''
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
                  <Text className="text-xs text-amber-700 dark:text-amber-400 font-medium ml-1.5">
                    Đợt này mua {currentNum} viên. Còn thiếu {remainingNeeded} viên để hoàn tất {selectedMonths} tháng điều trị.
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center mt-2.5">
                  <Check size={14} color="#10B981" />
                  <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-1.5">
                    Đã chuẩn bị đủ toàn bộ thuốc cho liệu trình!
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* 5. Lịch uống trong ngày */}
        <Card className="mb-6 p-4 border-border/80">
          <View className="flex-row items-center mb-2.5">
            <Clock size={18} color="#0D9488" />
            <Text className="text-base font-semibold text-foreground ml-2">
              Khung giờ uống thuốc
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2 mt-1">
            {QUICK_TIMES.map((time) => {
              const isSelected = selectedTimes.includes(time);
              return (
                <TouchableOpacity
                  key={time}
                  onPress={() => toggleTime(time)}
                  className={`px-3.5 py-2.5 rounded-xl border flex-row items-center ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'bg-card border-border'
                  }`}
                >
                  {isSelected && (
                    <Check size={14} color="#FFFFFF" strokeWidth={2.5} className="mr-1" />
                  )}
                  <Text
                    className={`text-sm font-medium ${
                      isSelected ? 'text-white font-semibold' : 'text-foreground'
                    }`}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
    </SafeAreaView>
  );
}
