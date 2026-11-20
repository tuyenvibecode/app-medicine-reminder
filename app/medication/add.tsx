// app/medication/add.tsx
// Màn hình Thêm thuốc mới vào tủ thuốc & đặt lịch nhắc

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
import { Camera, Image as ImageIcon, X, Clock, Pill, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const QUICK_TIMES = ['07:30 (Sáng)', '12:00 (Trưa)', '18:30 (Chiều)', '21:00 (Tối)'];

export default function AddMedicationScreen() {
  const router = useRouter();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');
  const [stock, setStock] = useState('30');
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

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Chưa đủ thông tin', 'Vui lòng nhập tên thuốc.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    Alert.alert('Thành công', `Đã thêm thuốc "${name}" vào tủ thuốc và đặt lịch nhắc.`, [
      { text: 'Xong', onPress: () => router.back() },
    ]);
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
            placeholder="Ví dụ: Panadol Extra, Amlodipine..."
            className="mb-4"
          />

          <Text className="text-sm font-semibold text-foreground mb-1.5">
            Liều lượng & Cách dùng
          </Text>
          <Input
            value={dosage}
            onChangeText={setDosage}
            placeholder="Ví dụ: 1 viên - Sau khi ăn"
            className="mb-4"
          />

          <Text className="text-sm font-semibold text-foreground mb-1.5">
            Số lượng có sẵn (viên)
          </Text>
          <Input
            value={stock}
            onChangeText={setStock}
            placeholder="30"
            keyboardType="numeric"
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

        {/* 3. Lịch uống trong ngày */}
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
