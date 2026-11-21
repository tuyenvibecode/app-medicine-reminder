// app/doctor-prescriptions/index.tsx
// Màn hình "Đơn thuốc của bạn"
// Lưu ảnh chụp toa thuốc độ phân giải gốc (HD), AI tự động đọc ảnh điền tên thuốc/loại bệnh/ghi chú tái khám,
// và theo dõi chỉ số Huyết áp / Đường huyết để tự động so sánh giữa các lần khám.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  Activity,
  Pill,
  TrendingDown,
  TrendingUp,
  Check,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/context/AppContext';
import {
  AI_PRESCRIPTION_TEMPLATES,
  analyzePrescriptionImageWithBackup,
} from '@/services/aiPrescriptionService';
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
  const { autoCapture } = useLocalSearchParams<{ autoCapture?: string }>();
  const {
    doctorPrescriptions,
    addDoctorPrescription,
    deleteDoctorPrescription,
    reminderSettings,
  } = useAppStore();

  // Modal thêm đơn thuốc mới
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiScannedSuccess, setAiScannedSuccess] = useState(false);
  const [usedAiModelLabel, setUsedAiModelLabel] = useState('');

  const [conditionType, setConditionType] = useState<'blood_pressure' | 'diabetes' | 'general'>(
    'blood_pressure'
  );
  const [title, setTitle] = useState('');
  const [medicationsText, setMedicationsText] = useState('');
  const [startDate, setStartDate] = useState(() => format(new Date(), 'dd/MM/yyyy'));
  const [notes, setNotes] = useState('');

  // Thông số Huyết áp / Đường huyết để so sánh giữa các đợt khám
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');

  // Modal xem ảnh phóng to sắc nét toàn màn hình
  const [viewerItem, setViewerItem] = useState<DoctorPrescription | null>(null);
  const [zoomScale, setZoomScale] = useState<1 | 1.8 | 2.5>(1);

  const openAddModal = () => {
    setPhotoUri(null);
    setIsAiScanning(false);
    setAiScannedSuccess(false);
    setConditionType('blood_pressure');
    setTitle('');
    setMedicationsText('');
    setStartDate(format(new Date(), 'dd/MM/yyyy'));
    setNotes('');
    setSystolic('');
    setDiastolic('');
    setBloodSugar('');
    setAddModalVisible(true);
  };

  /**
   * AI tự động đọc ảnh toa thuốc qua chuỗi 4 tầng dự phòng (aiPrescriptionService):
   * gemini-4-hydrogen -> gemini-3.5-flash-lite -> gemini-4-argon -> Offline Smart Fallback
   */
  const runAiAutoFillFromImage = async (uri: string, templateIdx = 0) => {
    setIsAiScanning(true);
    setAiScannedSuccess(false);
    try {
      const result = await analyzePrescriptionImageWithBackup({
        imageUri: uri,
        preferredModel: reminderSettings.preferredAiModel,
        fallbackIndex: templateIdx,
      });

      setConditionType(result.conditionType);
      setTitle(result.title);
      setMedicationsText(result.medicationsText);
      setSystolic(result.systolic);
      setDiastolic(result.diastolic);
      setBloodSugar(result.bloodSugar);
      setNotes(result.notes);
      setUsedAiModelLabel(result.usedModel);
      setAiScannedSuccess(true);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch {
      // Nếu lỗi vẫn cho phép tự điền hoặc chọn mẫu
    } finally {
      setIsAiScanning(false);
    }
  };

  const applyTemplate = (tpl: (typeof AI_PRESCRIPTION_TEMPLATES)[number]) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setConditionType(tpl.conditionType);
    setTitle(tpl.title);
    setMedicationsText(tpl.medicationsText);
    setSystolic(tpl.systolic);
    setDiastolic(tpl.diastolic);
    setBloodSugar(tpl.bloodSugar);
    setNotes(tpl.notes);
    setAiScannedSuccess(true);
  };

  // Chụp ảnh đơn thuốc ở chất lượng cao nhất (quality: 1, không cắt ép khung vuông)
  const handleTakeHighResPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền Camera', 'Vui lòng cấp quyền máy ảnh để chụp đơn thuốc của bạn.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const cleanHighResUri = await preserveHighResAndStripExif(result.assets[0].uri);
        setPhotoUri(cleanHighResUri);
        await runAiAutoFillFromImage(cleanHighResUri, doctorPrescriptions.length);
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
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const cleanHighResUri = await preserveHighResAndStripExif(result.assets[0].uri);
        setPhotoUri(cleanHighResUri);
        await runAiAutoFillFromImage(cleanHighResUri, doctorPrescriptions.length);
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể mở thư viện ảnh.');
    }
  };

  const handleSavePrescription = () => {
    if (!photoUri) {
      Alert.alert('Chưa có ảnh đơn thuốc', 'Vui lòng chụp ảnh hoặc chọn ảnh đơn thuốc từ album.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const sysNum = parseFloat(systolic);
    const diaNum = parseFloat(diastolic);
    const sugarNum = parseFloat(bloodSugar.replace(',', '.'));

    addDoctorPrescription({
      title:
        title.trim() ||
        `Đơn thuốc của bạn (${startDate.trim() || format(new Date(), 'dd/MM/yyyy')})`,
      conditionType,
      medicationsText: medicationsText.trim() || undefined,
      bloodPressureSystolic: !isNaN(sysNum) && sysNum > 0 ? sysNum : null,
      bloodPressureDiastolic: !isNaN(diaNum) && diaNum > 0 ? diaNum : null,
      bloodSugar: !isNaN(sugarNum) && sugarNum > 0 ? sugarNum : null,
      startDate: startDate.trim() || format(new Date(), 'dd/MM/yyyy'),
      imageUri: photoUri,
      notes: notes.trim() || undefined,
    });

    setAddModalVisible(false);
    Alert.alert('Đã lưu đơn thuốc!', 'Đơn thuốc và các chỉ số theo dõi đã được lưu sắc nét.');
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

  // Khi bấm nút Camera ở chính giữa thanh Bottom Bar -> Tự động mở Modal lưu đơn và bật Camera chụp ngay
  useEffect(() => {
    if (autoCapture === '1') {
      const openTimer = setTimeout(() => {
        openAddModal();
      }, 60);
      const cameraTimer = setTimeout(() => {
        handleTakeHighResPhoto();
      }, 300);
      return () => {
        clearTimeout(openTimer);
        clearTimeout(cameraTimer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCapture]);

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
              Đơn thuốc của bạn
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              AI tự điền thông tin & so sánh chỉ số khám
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
        {/* Banner hướng dẫn: Dùng màu nền đặc #F0FDFA không dùng shadow để tránh lỗi hộp trắng trên Android (Fix Hình 2) */}
        <View
          style={{
            backgroundColor: '#F0FDFA',
            borderColor: '#99F6E4',
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Sparkles size={18} color="#0D9488" />
          <Text
            style={{
              fontSize: 12,
              color: '#0F172A',
              fontWeight: '500',
              marginLeft: 10,
              flex: 1,
              lineHeight: 18,
            }}
          >
            Khi chụp ảnh toa thuốc, <Text style={{ fontWeight: '700', color: '#0D9488' }}>AI sẽ tự động đọc và điền</Text> tên bệnh, thuốc, ngày tái khám và giữ ảnh ở độ nét gốc 100% (HD).
          </Text>
        </View>

        {doctorPrescriptions.length === 0 ? (
          <Card className="items-center justify-center py-12 px-5 border-border/70">
            <View className="h-16 w-16 rounded-3xl bg-primary/10 items-center justify-center mb-3">
              <FileText size={32} color="#0D9488" strokeWidth={1.8} />
            </View>
            <Text className="text-base font-bold text-foreground text-center">
              Chưa có đơn thuốc nào được lưu
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-1.5 mb-5 leading-relaxed">
              Chụp lại tờ đơn thuốc bác sĩ kê hoặc lấy từ album ảnh để AI tự động trích xuất thông tin và theo dõi chỉ số Đường huyết / Huyết áp qua từng đợt khám.
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
          doctorPrescriptions.map((item, idx) => {
            // Tìm đơn thuốc lần trước để so sánh chỉ số Huyết áp / Đường huyết
            const prevPrescription = doctorPrescriptions
              .slice(idx + 1)
              .find(
                (p) =>
                  (item.bloodPressureSystolic && p.bloodPressureSystolic) ||
                  (item.bloodSugar && p.bloodSugar)
              );

            const sysDiff =
              item.bloodPressureSystolic && prevPrescription?.bloodPressureSystolic
                ? item.bloodPressureSystolic - prevPrescription.bloodPressureSystolic
                : null;

            const sugarDiff =
              item.bloodSugar && prevPrescription?.bloodSugar
                ? Number((item.bloodSugar - prevPrescription.bloodSugar).toFixed(1))
                : null;

            return (
              <Card key={item.id} className="mb-4 p-4 border-border/80">
                {/* Hàng trên: Tiêu đề & Ngày bắt đầu */}
                <View className="flex-row items-start justify-between mb-2.5">
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-bold text-foreground">
                      {item.title}
                    </Text>
                  </View>

                  <View className="flex-row items-center bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-xl">
                    <Calendar size={12} color="#0D9488" />
                    <Text className="text-xs font-bold text-primary ml-1.5">
                      {item.startDate}
                    </Text>
                  </View>
                </View>

                {/* Danh sách thuốc trích xuất từ đơn */}
                {item.medicationsText ? (
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      padding: 10,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Pill size={15} color="#0D9488" style={{ marginTop: 2 }} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                        THUỐC TRONG ĐƠN:
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: '#0F172A',
                          marginTop: 2,
                        }}
                      >
                        {item.medicationsText}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Bảng chỉ số Huyết áp / Đường huyết & So sánh với lần khám trước */}
                {(item.bloodPressureSystolic || item.bloodSugar) && (
                  <View
                    style={{
                      backgroundColor: '#F0FDFA',
                      borderRadius: 12,
                      padding: 10,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: '#CCFBF1',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Activity size={14} color="#0D9488" />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: '#0F766E',
                          marginLeft: 6,
                        }}
                      >
                        CHỈ SỐ ĐỢT KHÁM & SO SÁNH:
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {item.bloodPressureSystolic && (
                        <View
                          style={{
                            flex: 1,
                            minWidth: 130,
                            backgroundColor: '#FFFFFF',
                            padding: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                          }}
                        >
                          <Text style={{ fontSize: 11, color: '#64748B' }}>Huyết áp</Text>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                            {item.bloodPressureSystolic}/{item.bloodPressureDiastolic || 80} mmHg
                          </Text>
                          {sysDiff !== null && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                              {sysDiff <= 0 ? (
                                <TrendingDown size={12} color="#10B981" />
                              ) : (
                                <TrendingUp size={12} color="#F59E0B" />
                              )}
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '600',
                                  color: sysDiff <= 0 ? '#059669' : '#D97706',
                                  marginLeft: 4,
                                }}
                              >
                                {sysDiff === 0
                                  ? 'Ổn định so với lần trước'
                                  : sysDiff < 0
                                  ? `Giảm ${Math.abs(sysDiff)} mmHg so với lần trước`
                                  : `Tăng +${sysDiff} mmHg so với lần trước`}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {item.bloodSugar && (
                        <View
                          style={{
                            flex: 1,
                            minWidth: 130,
                            backgroundColor: '#FFFFFF',
                            padding: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                          }}
                        >
                          <Text style={{ fontSize: 11, color: '#64748B' }}>Đường huyết</Text>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                            {item.bloodSugar} mmol/L
                          </Text>
                          {sugarDiff !== null && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                              {sugarDiff <= 0 ? (
                                <TrendingDown size={12} color="#10B981" />
                              ) : (
                                <TrendingUp size={12} color="#F59E0B" />
                              )}
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '600',
                                  color: sugarDiff <= 0 ? '#059669' : '#D97706',
                                  marginLeft: 4,
                                }}
                              >
                                {sugarDiff === 0
                                  ? 'Ổn định so với lần trước'
                                  : sugarDiff < 0
                                  ? `Giảm ${Math.abs(sugarDiff)} mmol/L so với lần trước`
                                  : `Tăng +${sugarDiff} mmol/L so với lần trước`}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                )}

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
                      height: 200,
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
                    📌 Ghi chú tái khám: {item.notes}
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
            );
          })
        )}
      </ScrollView>

      {/* MODAL 1: LƯU ĐƠN THUỐC CỦA BẠN (AI TỰ ĐIỀN + THEO DÕI CHỈ SỐ) */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[92%]">
            <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
              <Text className="text-lg font-bold text-foreground">
                Lưu đơn thuốc của bạn
              </Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                className="h-8 w-8 rounded-full bg-muted/60 items-center justify-center"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView className="py-3" showsVerticalScrollIndicator={false}>
              {/* Khu vực chụp / chọn ảnh độ nét cao (Fix Hình 3: Không bị tràn nút ra ngoài) */}
              {photoUri ? (
                <View className="mb-4">
                  <View className="relative">
                    <Image
                      source={{ uri: photoUri }}
                      style={{
                        width: '100%',
                        height: 190,
                        borderRadius: 16,
                        backgroundColor: '#F1F5F9',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                      }}
                      contentFit="contain"
                    />
                    <View
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        backgroundColor: 'rgba(13, 148, 136, 0.92)',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                        ✓ Ảnh gốc sắc nét (HD)
                      </Text>
                    </View>
                  </View>

                  {/* 2 nút Chụp lại & Chọn từ Album chia đều 50/50 gọn trong khung (Fix Hình 3) */}
                  <View className="flex-row gap-2.5 mt-2.5">
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleTakeHighResPhoto}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        backgroundColor: '#FFFFFF',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Camera size={15} color="#0D9488" />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A', marginLeft: 6 }}>
                        Chụp lại ảnh
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handlePickHighResImage}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        backgroundColor: '#FFFFFF',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ImageIcon size={15} color="#0D9488" />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A', marginLeft: 6 }}>
                        Chọn ảnh khác
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: '#0D9488',
                    backgroundColor: '#F0FDFA',
                    borderRadius: 16,
                    padding: 18,
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <FileText size={30} color="#0D9488" />
                  <Text className="text-sm font-bold text-foreground mt-2">
                    Chụp ảnh đơn thuốc để AI tự điền
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center mt-1 mb-4">
                    Ảnh được lưu sắc nét 100% và AI sẽ tự động điền thông tin bên dưới
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

              {/* Trạng thái AI đang đọc ảnh toa thuốc */}
              {isAiScanning && (
                <View
                  style={{
                    backgroundColor: '#F0FDFA',
                    borderColor: '#99F6E4',
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <ActivityIndicator size="small" color="#0D9488" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F766E', marginLeft: 10 }}>
                    ✨ AI đang đọc chữ trên đơn thuốc và tự điền thông tin...
                  </Text>
                </View>
              )}

              {aiScannedSuccess && !isAiScanning && (
                <View
                  style={{
                    backgroundColor: '#F0FDFA',
                    borderColor: '#99F6E4',
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 10,
                    marginBottom: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Sparkles size={15} color="#0D9488" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F766E', marginLeft: 6, flex: 1 }}>
                      AI đã tự động điền thông tin ({usedAiModelLabel || reminderSettings.preferredAiModel})! Hãy kiểm tra lại trước khi lưu:
                    </Text>
                  </View>
                </View>
              )}

              {/* Thanh chọn nhanh Loại bệnh (có Swiper ngang mượt mà) */}
              <Text className="text-xs font-semibold text-foreground mb-1.5">
                Chọn nhanh nhóm bệnh (AI gợi ý & tự điền mẫu):
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
              >
                {AI_PRESCRIPTION_TEMPLATES.map((tpl) => {
                  const isSelected = conditionType === tpl.conditionType && title === tpl.title;
                  return (
                    <TouchableOpacity
                      key={tpl.id}
                      onPress={() => applyTemplate(tpl)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isSelected ? '#0D9488' : '#FFFFFF',
                        borderColor: isSelected ? '#0D9488' : '#E2E8F0',
                      }}
                    >
                      {isSelected && <Check size={13} color="#FFFFFF" style={{ marginRight: 5 }} />}
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: isSelected ? '#FFFFFF' : '#0F172A',
                        }}
                      >
                        {tpl.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

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

              {/* Tên đơn thuốc / Loại bệnh */}
              <Text className="text-xs font-semibold text-foreground mb-1.5">
                Loại bệnh / Tên đơn thuốc
              </Text>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Ví dụ: Đơn thuốc Huyết áp, Tiểu đường..."
                className="mb-3.5"
              />

              {/* Tên các thuốc trong đơn (AI tự điền) */}
              <Text className="text-xs font-semibold text-foreground mb-1.5">
                Các thuốc trong đơn (AI tự điền hoặc nhập thêm)
              </Text>
              <Input
                value={medicationsText}
                onChangeText={setMedicationsText}
                placeholder="Ví dụ: Amlodipine 5mg, Glucophage 500mg..."
                className="mb-3.5"
              />

              {/* KHUNG LƯU CHỈ SỐ HUYẾT ÁP & ĐƯỜNG HUYẾT ĐỂ LẦN SAU SO SÁNH */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginBottom: 14,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <Activity size={16} color="#0D9488" />
                  <Text className="text-xs font-bold text-foreground ml-1.5">
                    Chỉ số Huyết áp / Đường huyết lúc khám (để so sánh lần sau)
                  </Text>
                </View>

                <View className="flex-row gap-2.5 mb-2.5">
                  <View className="flex-1">
                    <Text className="text-[11px] text-muted-foreground mb-1">
                      Huyết áp Tâm thu (mmHg)
                    </Text>
                    <Input
                      value={systolic}
                      onChangeText={setSystolic}
                      placeholder="130"
                      keyboardType="numeric"
                      className="h-10 text-sm"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] text-muted-foreground mb-1">
                      Huyết áp Tâm trương
                    </Text>
                    <Input
                      value={diastolic}
                      onChangeText={setDiastolic}
                      placeholder="85"
                      keyboardType="numeric"
                      className="h-10 text-sm"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-[11px] text-muted-foreground mb-1">
                    Đường huyết (mmol/L) - Nếu khám tiểu đường
                  </Text>
                  <Input
                    value={bloodSugar}
                    onChangeText={setBloodSugar}
                    placeholder="Ví dụ: 6.4"
                    keyboardType="decimal-pad"
                    className="h-10 text-sm"
                  />
                </View>
              </View>

              {/* Ghi chú tái khám (AI tự điền) */}
              <Text className="text-xs font-semibold text-foreground mb-1.5">
                Ghi chú tái khám & Dặn dò (AI tự điền)
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
                Lưu đơn thuốc của bạn
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
