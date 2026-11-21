// app/doctor-prescriptions/index.tsx
// Màn hình "Đơn thuốc Bác sĩ kê" (Lưu trữ ảnh chụp toa thuốc độ phân giải cao sắc nét & ngày bắt đầu)
// Hỗ trợ chụp từ Camera hoặc chọn từ Album, giữ nguyên độ nét gốc và phóng to toàn màn hình để đọc rõ chữ.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Plus,
  Calendar,
  FileText,
  ZoomIn,
  Trash2,
  X,
  Sparkles,
  Building2,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/context/AppContext';
import type { DoctorPrescription } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Giữ nguyên độ phân giải gốc (High-Resolution) để chữ trên giấy đơn thuốc sắc nét nhất,
 * chỉ chạy qua ImageManipulator ở mức compress 0.98 không resize để xoá thông tin vị trí EXIF GPS (Rule 01).
 */
async function preserveHighResAndStripExif(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [], // Tuyệt đối không thu nhỏ kích thước ảnh để giữ chữ trên toa thuốc sắc nét 100%
      { compress: 0.98, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
}

export default function DoctorPrescriptionsScreen() {
  const router = useRouter();
  const { doctorPrescriptions, addDoctorPrescription, deleteDoctorPrescription } = useAppStore();

  // Modal thêm đơn thuốc bác sĩ mới
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [doctorOrHospital, setDoctorOrHospital] = useState('');
  const [startDate, setStartDate] = useState(() => format(new Date(), 'dd/MM/yyyy'));
  const [notes, setNotes] = useState('');

  // Modal xem ảnh phóng to sắc nét toàn màn hình
  const [viewerItem, setViewerItem] = useState<DoctorPrescription | null>(null);
  const [zoomScale, setZoomScale] = useState<1 | 1.8 | 2.5>(1);

  const openAddModal = () => {
    setPhotoUri(null);
    setTitle('');
    setDoctorOrHospital('');
    setStartDate(format(new Date(), 'dd/MM/yyyy'));
    setNotes('');
    setAddModalVisible(true);
  };

  // Chụp ảnh đơn thuốc ở chất lượng cao nhất (quality: 1, không cắt ép khung vuông)
  const handleTakeHighResPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền Camera', 'Vui lòng cấp quyền máy ảnh để chụp đơn thuốc của bác sĩ.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // Giữ nguyên toàn bộ tờ đơn thuốc không bị cắt mất chữ
        quality: 1, // Chất lượng sắc nét tối đa (100%)
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const cleanHighResUri = await preserveHighResAndStripExif(result.assets[0].uri);
        setPhotoUri(cleanHighResUri);
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể mở máy ảnh.');
    }
  };

  // Chọn ảnh đơn thuốc từ Album ở chất lượng gốc (quality: 1)
  const handlePickHighResImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Giữ nguyên tỷ lệ tờ giấy đơn thuốc
        quality: 1, // Độ nét gốc 100%
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const cleanHighResUri = await preserveHighResAndStripExif(result.assets[0].uri);
        setPhotoUri(cleanHighResUri);
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể mở thư viện ảnh.');
    }
  };

  const handleSavePrescription = () => {
    if (!photoUri) {
      Alert.alert('Chưa có ảnh đơn thuốc', 'Vui lòng chụp ảnh hoặc chọn ảnh đơn thuốc của bác sĩ từ album.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    addDoctorPrescription({
      title: title.trim() || `Đơn thuốc bác sĩ (${startDate.trim() || format(new Date(), 'dd/MM/yyyy')})`,
      doctorOrHospital: doctorOrHospital.trim() || undefined,
      startDate: startDate.trim() || format(new Date(), 'dd/MM/yyyy'),
      imageUri: photoUri,
      notes: notes.trim() || undefined,
    });

    setAddModalVisible(false);
    Alert.alert('Đã lưu đơn thuốc!', 'Hình ảnh đơn thuốc đã được lưu ở độ phân giải sắc nét nhất.');
  };

  const handleConfirmDelete = (item: DoctorPrescription) => {
    Alert.alert('Xoá đơn thuốc', `Bạn có chắc muốn xoá "${item.title}" khỏi danh sách lưu trữ?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => deleteDoctorPrescription(item.id),
      },
    ]);
  };

  const openFullViewer = (item: DoctorPrescription) => {
    setZoomScale(1);
    setViewerItem(item);
  };

  const cycleZoom = () => {
    setZoomScale((prev) => (prev === 1 ? 1.8 : prev === 1.8 ? 2.5 : 1));
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/50 bg-card">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 rounded-full bg-muted/60 items-center justify-center mr-3"
            accessibilityLabel="Quay lại"
          >
            <ArrowLeft size={20} color="#64748B" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
              Đơn thuốc Bác sĩ kê
            </Text>
            <Text className="text-xs text-muted-foreground">
              Lưu ảnh gốc sắc nét & ngày bắt đầu điều trị
            </Text>
          </View>
        </View>

        <Button
          variant="default"
          size="sm"
          className="flex-row items-center bg-primary px-3.5 rounded-full"
          onPress={openAddModal}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-white font-semibold text-xs ml-1">Lưu đơn mới</Text>
        </Button>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner hướng dẫn chụp rõ nét */}
        <Card className="mb-4 p-3.5 border-primary/30 bg-primary/5">
          <View className="flex-row items-center">
            <Sparkles size={18} color="#0D9488" />
            <Text className="text-xs text-foreground font-medium ml-2 flex-1 leading-relaxed">
              Ảnh toa thuốc tại đây được giữ ở <Text className="font-bold text-primary">độ phân giải gốc 100% (HD)</Text> không bị nén mờ, giúp bạn phóng to đọc rõ từng chữ bác sĩ kê.
            </Text>
          </View>
        </Card>

        {doctorPrescriptions.length === 0 ? (
          <Card className="items-center justify-center py-12 px-5 border-border/70">
            <View className="h-16 w-16 rounded-3xl bg-primary/10 items-center justify-center mb-3">
              <FileText size={32} color="#0D9488" strokeWidth={1.8} />
            </View>
            <Text className="text-base font-bold text-foreground text-center">
              Chưa có đơn thuốc bác sĩ nào được lưu
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-1.5 mb-5 leading-relaxed">
              Hãy chụp lại tờ đơn thuốc giấy do bác sĩ kê hoặc tải từ album ảnh để lưu ngày bắt đầu và tra cứu lại bất cứ lúc nào.
            </Text>
            <Button
              variant="default"
              size="default"
              className="bg-primary px-5 rounded-2xl h-12"
              onPress={openAddModal}
            >
              <Camera size={18} color="#FFFFFF" />
              <Text className="text-white font-bold text-sm ml-2">
                Chụp / Tải ảnh đơn thuốc ngay
              </Text>
            </Button>
          </Card>
        ) : (
          doctorPrescriptions.map((item) => (
            <Card key={item.id} className="mb-4 p-4 border-border/80">
              {/* Hàng trên: Tiêu đề & Ngày bắt đầu */}
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-base font-bold text-foreground">
                    {item.title}
                  </Text>
                  {item.doctorOrHospital ? (
                    <View className="flex-row items-center mt-1">
                      <Building2 size={13} color="#64748B" />
                      <Text className="text-xs text-muted-foreground ml-1.5">
                        {item.doctorOrHospital}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View className="flex-row items-center bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-xl">
                  <Calendar size={12} color="#0D9488" />
                  <Text className="text-xs font-bold text-primary ml-1.5">
                    Bắt đầu: {item.startDate}
                  </Text>
                </View>
              </View>

              {/* Khung ảnh đơn thuốc sắc nét - Chạm để mở toàn màn hình */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openFullViewer(item)}
                className="relative rounded-2xl overflow-hidden border border-border bg-muted/30"
              >
                <Image
                  source={{ uri: item.imageUri }}
                  style={{
                    width: '100%',
                    height: 220,
                    backgroundColor: '#F8FAFC',
                  }}
                  contentFit="cover"
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    backgroundColor: 'rgba(15, 23, 42, 0.78)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <ZoomIn size={14} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginLeft: 5 }}>
                    Chạm để phóng to rõ nét (HD)
                  </Text>
                </View>
              </TouchableOpacity>

              {item.notes ? (
                <Text className="text-xs text-muted-foreground mt-2.5 leading-relaxed">
                  Ghi chú: {item.notes}
                </Text>
              ) : null}

              {/* Thanh công cụ dưới */}
              <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-border/40">
                <TouchableOpacity
                  onPress={() => openFullViewer(item)}
                  className="flex-row items-center"
                >
                  <ZoomIn size={15} color="#0D9488" />
                  <Text className="text-xs font-bold text-primary ml-1.5">
                    Mở xem toàn màn hình
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleConfirmDelete(item)}
                  className="flex-row items-center px-2 py-1"
                >
                  <Trash2 size={14} color="#EF4444" />
                  <Text className="text-xs font-medium text-destructive ml-1">
                    Xoá
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* MODAL 1: THÊM ĐƠN THUỐC BÁC SĨ MỚI */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[90%]">
            <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
              <Text className="text-lg font-bold text-foreground">
                Lưu đơn thuốc Bác sĩ kê
              </Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                className="h-8 w-8 rounded-full bg-muted/60 items-center justify-center"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView className="py-3" showsVerticalScrollIndicator={false}>
              {/* Khu vực chụp / chọn ảnh độ nét cao */}
              {photoUri ? (
                <View className="mb-4">
                  <Image
                    source={{ uri: photoUri }}
                    style={{
                      width: '100%',
                      height: 210,
                      borderRadius: 16,
                      backgroundColor: '#F1F5F9',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                    contentFit="contain"
                  />
                  <View className="flex-row items-center justify-between mt-2.5">
                    <Badge variant="success" label="✓ Đã lưu chất lượng gốc sắc nét (HD)" />
                    <View className="flex-row gap-2">
                      <Button variant="outline" size="sm" onPress={handleTakeHighResPhoto}>
                        <Text className="text-xs text-foreground">Chụp lại</Text>
                      </Button>
                      <Button variant="outline" size="sm" onPress={handlePickHighResImage}>
                        <Text className="text-xs text-foreground">Đổi ảnh</Text>
                      </Button>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="border-2 border-dashed border-primary/40 bg-primary/5 rounded-2xl p-5 items-center mb-4">
                  <FileText size={32} color="#0D9488" />
                  <Text className="text-sm font-bold text-foreground mt-2">
                    Hình ảnh tờ đơn thuốc (Chất lượng HD)
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center mt-1 mb-4">
                    Đặt tờ đơn thuốc nơi đủ sáng để chữ của bác sĩ rõ nét nhất
                  </Text>
                  <View className="flex-row gap-3 w-full">
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleTakeHighResPhoto}
                      style={{
                        flex: 1,
                        backgroundColor: '#0D9488',
                        height: 44,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Camera size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginLeft: 6 }}>
                        Chụp ảnh nét
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handlePickHighResImage}
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#0D9488',
                        height: 44,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ImageIcon size={16} color="#0D9488" />
                      <Text style={{ color: '#0D9488', fontWeight: '700', fontSize: 13, marginLeft: 6 }}>
                        Chọn từ Album
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Ngày bắt đầu khởi tạo đơn thuốc */}
              <Text className="text-xs font-semibold text-foreground mb-1.5">
                Ngày bắt đầu đơn thuốc *
              </Text>
              <Input
                value={startDate}
                onChangeText={setStartDate}
                placeholder="Ví dụ: 21/11/2026"
                className="mb-3.5 font-semibold"
              />

              {/* Tên đơn thuốc / Bệnh lý */}
              <Text className="text-xs font-semibold text-foreground mb-1.5">
                Tên gọi / Đợt khám
              </Text>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Ví dụ: Đơn thuốc Huyết áp tháng 11, Toa khám Dạ dày..."
                className="mb-3.5"
              />

              {/* Bệnh viện / Bác sĩ kê */}
              <Text className="text-xs font-semibold text-foreground mb-1.5">
                Bệnh viện / Bác sĩ kê đơn (tuỳ chọn)
              </Text>
              <Input
                value={doctorOrHospital}
                onChangeText={setDoctorOrHospital}
                placeholder="Ví dụ: BV Đại học Y Dược - BS. Hùng"
                className="mb-3.5"
              />

              {/* Ghi chú */}
              <Text className="text-xs font-semibold text-foreground mb-1.5">
                Ghi chú tái khám / Dặn dò
              </Text>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Ví dụ: Uống hết 1 tháng tái khám..."
                className="mb-4"
              />
            </ScrollView>

            <Button
              variant="default"
              size="lg"
              className="bg-primary w-full h-13 rounded-2xl"
              onPress={handleSavePrescription}
            >
              <Text className="text-white font-bold text-base">
                Lưu đơn thuốc sắc nét
              </Text>
            </Button>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: XEM ẢNH ĐƠN THUỐC PHÓNG TO SẮC NÉT TOÀN MÀN HÌNH */}
      <Modal
        visible={!!viewerItem}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerItem(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.96)' }}>
          {/* Thanh điều khiển trên cùng */}
          <View
            style={{
              paddingTop: 48,
              paddingBottom: 12,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
                {viewerItem?.title}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                Ngày bắt đầu: {viewerItem?.startDate} • Độ nét gốc HD
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={cycleZoom}
                style={{
                  backgroundColor: '#0D9488',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <ZoomIn size={15} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                  Phóng to {zoomScale}x
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setViewerItem(null)}
                style={{
                  height: 36,
                  width: 36,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Khung cuộn 2 chiều hỗ trợ phóng to xem từng chữ nhỏ trên đơn thuốc */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            horizontal={zoomScale > 1}
            showsHorizontalScrollIndicator={true}
            showsVerticalScrollIndicator={true}
          >
            <ScrollView
              contentContainerStyle={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 20,
              }}
            >
              {viewerItem?.imageUri && (
                <Image
                  source={{ uri: viewerItem.imageUri }}
                  style={{
                    width: SCREEN_WIDTH * zoomScale,
                    height: SCREEN_HEIGHT * 0.72 * zoomScale,
                  }}
                  contentFit="contain"
                />
              )}
            </ScrollView>
          </ScrollView>

          <View style={{ paddingBottom: 28, paddingHorizontal: 20, alignItems: 'center' }}>
            <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center' }}>
              Bấm nút &ldquo;Phóng to {zoomScale}x&rdquo; ở góc trên và vuốt để xem rõ từng chữ trên toa thuốc
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
