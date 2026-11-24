// Mục đích: Tab hồ sơ đi khám bệnh viện (chụp nhiều ảnh giấy khám + đơn thuốc, so sánh chỉ số & thuốc thay đổi với tháng trước).

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import {
  Camera,
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  Pill,
} from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppAlert as Alert } from '@/components/ui/app-dialog';
import { useAppStore } from '@/context/AppContext';
import { analyzePrescriptionImageWithBackup } from '@/services/aiPrescriptionService';
import { removeVietnameseTones } from '@/services/medicineService';
import {
  comparePrescriptionMedications,
  evaluateBloodPressureVN,
  evaluateFastingBloodSugarVN,
  MEDICAL_DISCLAIMER_VN,
} from './standards';
import { prepareHealthPhoto, getSeverityVisual, type PreparedHealthPhoto } from './imageHelper';
import type { PrescriptionMedicineItem } from '@/types';

const CONDITION_OPTIONS: {
  id: 'blood_pressure' | 'diabetes' | 'general';
  label: string;
}[] = [
  { id: 'blood_pressure', label: 'Huyết áp' },
  { id: 'diabetes', label: 'Tiểu đường' },
  { id: 'general', label: 'Tổng quát' },
];

export function VisitHistoryTab() {
  const {
    doctorPrescriptions,
    medications,
    addDoctorPrescription,
    deleteDoctorPrescription,
    syncPrescriptionToReminders,
    archiveMedication,
    reminderSettings,
  } = useAppStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [photos, setPhotos] = useState<PreparedHealthPhoto[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  const [conditionType, setConditionType] = useState<'blood_pressure' | 'diabetes' | 'general'>('general');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(() => format(new Date(), 'dd/MM/yyyy'));
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [medicationsText, setMedicationsText] = useState('');
  const [notes, setNotes] = useState('');

  // Các thuốc người dùng tích xác nhận để đồng bộ vào Lịch nhắc / Ngừng thuốc cũ
  const [selectedAddKeys, setSelectedAddKeys] = useState<Record<string, boolean>>({});
  const [selectedArchiveKeys, setSelectedArchiveKeys] = useState<Record<string, boolean>>({});

  // Modal phóng to xem ảnh giấy khám / đơn thuốc
  const [zoomPhotoUri, setZoomPhotoUri] = useState<string | null>(null);

  const latestPreviousVisit = doctorPrescriptions[0];

  const medDiff = useMemo(
    () => comparePrescriptionMedications(latestPreviousVisit?.medicationsText, medicationsText),
    [latestPreviousVisit?.medicationsText, medicationsText]
  );

  const openNewVisitModal = () => {
    setPhotos([]);
    setIsScanning(false);
    setOcrNotice(null);
    setConditionType('general');
    setTitle('');
    setStartDate(format(new Date(), 'dd/MM/yyyy'));
    setSystolic('');
    setDiastolic('');
    setBloodSugar('');
    setMedicationsText('');
    setNotes('');
    setSelectedAddKeys({});
    setSelectedArchiveKeys({});
    setModalVisible(true);
  };

  const runAiScanOnPhotos = async (photoList: PreparedHealthPhoto[]) => {
    if (photoList.length === 0) return;
    setIsScanning(true);
    setOcrNotice(null);
    try {
      const result = await analyzePrescriptionImageWithBackup({
        imageBase64: photoList[0].base64,
        extraImagesBase64: photoList.slice(1).map((p) => p.base64 || '').filter(Boolean),
        preferredModel: reminderSettings.preferredAiModel,
      });

      if (result.source === 'cloud_ai') {
        if (result.title) setTitle(result.title);
        setConditionType(result.conditionType);
        if (result.medicationsText) setMedicationsText(result.medicationsText);
        if (result.systolic) setSystolic(result.systolic);
        if (result.diastolic) setDiastolic(result.diastolic);
        if (result.bloodSugar) setBloodSugar(result.bloodSugar);
        if (result.notes) setNotes(result.notes);
        setOcrNotice(`AI đã đọc thông tin (${result.usedModel}). Hãy kiểm tra lại trước khi lưu.`);
      } else {
        setOcrNotice(result.message || 'Vui lòng nhập tay thông tin từ ảnh giấy khám và đơn thuốc.');
      }
    } catch {
      setOcrNotice('Không thể đọc ảnh tự động. Bạn vui lòng nhập tay thông tin bên dưới.');
    } finally {
      setIsScanning(false);
    }
  };

  const appendPhoto = async (rawUri: string) => {
    const prepared = await prepareHealthPhoto(rawUri, true);
    setPhotos((prev) => {
      const next = [...prev, prepared];
      if (prev.length === 0) {
        runAiScanOnPhotos(next);
      }
      return next;
    });
  };

  const handleCapturePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền Camera', 'Vui lòng cấp quyền máy ảnh để chụp giấy khám và đơn thuốc.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
    if (!res.canceled && res.assets[0]?.uri) {
      await appendPhoto(res.assets[0].uri);
    }
  };

  const handlePickPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 1,
    });
    if (!res.canceled && res.assets.length > 0) {
      const preparedList = await Promise.all(
        res.assets.slice(0, 4).map((asset) => prepareHealthPhoto(asset.uri, true))
      );
      setPhotos((prev) => {
        const next = [...prev, ...preparedList].slice(0, 6);
        if (prev.length === 0) {
          runAiScanOnPhotos(next);
        }
        return next;
      });
    }
  };

  const toggleAddKey = (key: string) => {
    setSelectedAddKeys((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const toggleArchiveKey = (key: string) => {
    setSelectedArchiveKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveVisit = () => {
    if (photos.length === 0) {
      Alert.alert('Chưa có ảnh', 'Vui lòng chụp hoặc chọn ít nhất 1 ảnh giấy khám hoặc đơn thuốc.');
      return;
    }

    const sysNum = parseFloat(systolic);
    const diaNum = parseFloat(diastolic);
    const sugarNum = parseFloat(bloodSugar.replace(',', '.'));

    addDoctorPrescription({
      title: title.trim() || `Đợt khám ngày ${startDate.trim() || format(new Date(), 'dd/MM/yyyy')}`,
      conditionType,
      medicationsText: medicationsText.trim() || undefined,
      bloodPressureSystolic: !isNaN(sysNum) && sysNum > 0 ? sysNum : null,
      bloodPressureDiastolic: !isNaN(diaNum) && diaNum > 0 ? diaNum : null,
      bloodSugar: !isNaN(sugarNum) && sugarNum > 0 ? sugarNum : null,
      startDate: startDate.trim() || format(new Date(), 'dd/MM/yyyy'),
      imageUri: photos[0].uri,
      imageUris: photos.map((p) => p.uri),
      notes: notes.trim() || undefined,
    });

    // 1. Bổ sung các thuốc mới được người dùng tích xác nhận vào Tủ thuốc & Lịch nhắc
    const toAddItems: PrescriptionMedicineItem[] = medDiff.added
      .filter((entry) => selectedAddKeys[entry.normalizedKey] ?? true)
      .map((entry, idx) => ({
        id: `visit-med-${Date.now()}-${idx}`,
        name: entry.displayName,
        quantity: 30,
        unit: 'viên',
        dosageInstruction: entry.dosageHint,
        durationDays: 30,
        notes: `Thêm từ đơn khám ${startDate}`,
      }));

    if (toAddItems.length > 0) {
      syncPrescriptionToReminders(toAddItems);
    }

    // 2. Ngừng nhắc các thuốc cũ không còn trong đơn mới nếu người dùng chủ động tích chọn
    const toArchiveEntries = medDiff.removed.filter((entry) => selectedArchiveKeys[entry.normalizedKey]);
    if (toArchiveEntries.length > 0) {
      for (const entry of toArchiveEntries) {
        const matchedMed = medications.find(
          (m) =>
            m.is_active !== false &&
            removeVietnameseTones(m.name).includes(entry.normalizedKey)
        );
        if (matchedMed) {
          archiveMedication(matchedMed.id);
        }
      }
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setModalVisible(false);
    const summaryMsg =
      toAddItems.length > 0
        ? `Đã lưu hồ sơ khám và bổ sung ${toAddItems.length} thuốc mới vào Lịch nhắc.`
        : 'Đã lưu hồ sơ khám bệnh và chỉ số theo dõi.';
    Alert.alert('Lưu thành công!', summaryMsg);
  };

  return (
    <ScrollView
      className="flex-1 px-4 pt-3"
      contentContainerStyle={{ paddingBottom: 90 }}
      showsVerticalScrollIndicator={false}
    >
      <Button
        variant="default"
        className="w-full h-13 rounded-2xl bg-primary mb-4"
        onPress={openNewVisitModal}
      >
        <View className="flex-row items-center">
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-white font-bold text-base ml-2">
            Lưu đợt khám & Đơn thuốc mới
          </Text>
        </View>
      </Button>

      <View className="flex-row items-start bg-muted/60 rounded-2xl p-3 mb-4 border border-border/60">
        <Info size={16} color="#64748B" style={{ marginTop: 2 }} />
        <Text className="text-xs text-muted-foreground ml-2 flex-1 leading-relaxed">
          {MEDICAL_DISCLAIMER_VN}
        </Text>
      </View>

      <Text className="text-base font-bold text-foreground mb-3">
        Hồ sơ các lần đi khám ({doctorPrescriptions.length})
      </Text>

      {doctorPrescriptions.length === 0 ? (
        <Card className="items-center justify-center py-10 px-4 border-border/70">
          <FileText size={38} color="#94A3B8" strokeWidth={1.5} />
          <Text className="text-base font-semibold text-foreground mt-3">
            Chưa có hồ sơ khám nào
          </Text>
          <Text className="text-xs text-muted-foreground text-center mt-1">
            Chụp toàn bộ giấy khám và đơn thuốc bác sĩ để tự so sánh chỉ số và thay đổi thuốc qua từng tháng.
          </Text>
        </Card>
      ) : (
        doctorPrescriptions.map((item, idx) => {
          const prev = doctorPrescriptions[idx + 1];
          const allUris = item.imageUris && item.imageUris.length > 0 ? item.imageUris : [item.imageUri];
          const bpEval =
            item.bloodPressureSystolic && item.bloodPressureDiastolic
              ? evaluateBloodPressureVN(item.bloodPressureSystolic, item.bloodPressureDiastolic)
              : null;
          const sugarEval = item.bloodSugar ? evaluateFastingBloodSugarVN(item.bloodSugar) : null;
          const sysDiff =
            prev?.bloodPressureSystolic && item.bloodPressureSystolic
              ? item.bloodPressureSystolic - prev.bloodPressureSystolic
              : null;
          const sugarDiff =
            prev?.bloodSugar && item.bloodSugar
              ? Number((item.bloodSugar - prev.bloodSugar).toFixed(1))
              : null;
          const itemDiff = prev
            ? comparePrescriptionMedications(prev.medicationsText, item.medicationsText)
            : null;

          return (
            <Card key={item.id} className="p-4 mb-3.5 border-border/80">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-base font-bold text-foreground">{item.title}</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    Ngày khám: {item.startDate} • {allUris.length} ảnh
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Xoá hồ sơ khám?', `Xoá "${item.title}"?`, [
                      { text: 'Huỷ', style: 'cancel' },
                      {
                        text: 'Xoá',
                        style: 'destructive',
                        onPress: () => deleteDoctorPrescription(item.id),
                      },
                    ])
                  }
                  accessibilityLabel="Xoá hồ sơ khám"
                >
                  <Trash2 size={17} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Album ảnh giấy khám & đơn thuốc (chạm để xem phóng to) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 6 }}
              >
                {allUris.map((uri, uIdx) => (
                  <TouchableOpacity key={`${item.id}-img-${uIdx}`} onPress={() => setZoomPhotoUri(uri)}>
                    <Image
                      source={{ uri }}
                      style={{ width: 92, height: 112, borderRadius: 12 }}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Chỉ số & so sánh tháng trước */}
              {(bpEval || sugarEval) && (
                <View className="mt-2 pt-2 border-t border-border/50 gap-1.5">
                  {bpEval && (
                    <View>
                      <Text className="text-sm font-semibold text-foreground">
                        Huyết áp: {item.bloodPressureSystolic}/{item.bloodPressureDiastolic} mmHg{' '}
                        <Text style={{ color: getSeverityVisual(bpEval.severity).text }}>
                          ({bpEval.label})
                        </Text>
                      </Text>
                      {sysDiff !== null && sysDiff !== 0 && (
                        <View className="flex-row items-center mt-0.5">
                          {sysDiff < 0 ? (
                            <TrendingDown size={13} color="#10B981" />
                          ) : (
                            <TrendingUp size={13} color="#EA580C" />
                          )}
                          <Text className="text-xs text-muted-foreground ml-1">
                            {sysDiff > 0 ? `Tăng +${sysDiff}` : `Giảm ${Math.abs(sysDiff)}`} mmHg so với lần khám trước
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {sugarEval && (
                    <View>
                      <Text className="text-sm font-semibold text-foreground">
                        Đường huyết: {item.bloodSugar} mmol/L{' '}
                        <Text style={{ color: getSeverityVisual(sugarEval.severity).text }}>
                          ({sugarEval.label})
                        </Text>
                      </Text>
                      {sugarDiff !== null && sugarDiff !== 0 && (
                        <View className="flex-row items-center mt-0.5">
                          {sugarDiff < 0 ? (
                            <TrendingDown size={13} color="#10B981" />
                          ) : (
                            <TrendingUp size={13} color="#EA580C" />
                          )}
                          <Text className="text-xs text-muted-foreground ml-1">
                            {sugarDiff > 0 ? `Tăng +${sugarDiff}` : `Giảm ${Math.abs(sugarDiff)}`} mmol/L so với lần khám trước
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Danh sách thuốc & so sánh thay đổi */}
              {item.medicationsText ? (
                <View className="mt-2 pt-2 border-t border-border/50">
                  <View className="flex-row items-center mb-1">
                    <Pill size={14} color="#0D9488" />
                    <Text className="text-xs font-bold text-foreground ml-1.5">Thuốc trong đơn:</Text>
                  </View>
                  <Text className="text-xs text-muted-foreground leading-relaxed">
                    {item.medicationsText}
                  </Text>
                  {itemDiff && (itemDiff.added.length > 0 || itemDiff.removed.length > 0) && (
                    <View className="flex-row flex-wrap gap-2 mt-2">
                      {itemDiff.added.length > 0 && (
                        <View className="bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          <Text className="text-xs font-semibold text-emerald-700">
                            +{itemDiff.added.length} thuốc mới so với lần trước
                          </Text>
                        </View>
                      )}
                      {itemDiff.removed.length > 0 && (
                        <View className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                          <Text className="text-xs font-semibold text-amber-700">
                            -{itemDiff.removed.length} thuốc không còn trong đơn
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : null}

              {item.notes ? (
                <Text className="text-xs text-muted-foreground mt-2">Ghi chú: {item.notes}</Text>
              ) : null}
            </Card>
          );
        })
      )}

      {/* Modal thêm đợt khám mới (nhiều ảnh + đối chiếu thay đổi thuốc) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-background pt-12 px-4">
          <View className="flex-row items-center justify-between pb-3 border-b border-border/60">
            <Text className="text-lg font-bold text-foreground">
              Lưu giấy khám & Đơn thuốc
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="h-10 w-10 rounded-full bg-muted/70 items-center justify-center"
              accessibilityLabel="Đóng"
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 pt-3" contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Nút chụp / chọn nhiều ảnh */}
            <View className="flex-row gap-2.5 mb-3">
              <Button
                variant="default"
                className="flex-1 h-12 rounded-2xl bg-primary"
                onPress={handleCapturePhoto}
              >
                <View className="flex-row items-center">
                  <Camera size={18} color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm ml-2">Chụp giấy/đơn</Text>
                </View>
              </Button>
              <Button
                variant="outline"
                className="h-12 px-4 rounded-2xl border-primary/40"
                onPress={handlePickPhotos}
              >
                <View className="flex-row items-center">
                  <ImageIcon size={18} color="#0D9488" />
                  <Text className="text-primary font-semibold text-sm ml-1.5">Chọn nhiều ảnh</Text>
                </View>
              </Button>
            </View>

            {photos.length > 0 && (
              <View className="mb-3">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {photos.map((p, i) => (
                    <View key={`draft-photo-${i}`} className="relative">
                      <Image
                        source={{ uri: p.uri }}
                        style={{ width: 88, height: 108, borderRadius: 12 }}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: 'rgba(15,23,42,0.75)',
                          borderRadius: 999,
                          padding: 4,
                        }}
                      >
                        <X size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  onPress={() => runAiScanOnPhotos(photos)}
                  disabled={isScanning}
                  className="mt-2 flex-row items-center justify-center py-2.5 rounded-xl bg-primary/10 border border-primary/30"
                >
                  {isScanning ? (
                    <ActivityIndicator size="small" color="#0D9488" />
                  ) : (
                    <Sparkles size={15} color="#0D9488" />
                  )}
                  <Text className="text-xs font-bold text-primary ml-1.5">
                    {isScanning ? 'AI đang đọc các ảnh...' : `Quét lại bằng AI (${photos.length} ảnh)`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {ocrNotice && !isScanning && (
              <View className="bg-muted/70 p-3 rounded-xl mb-3">
                <Text className="text-xs text-foreground leading-relaxed">{ocrNotice}</Text>
              </View>
            )}

            {/* Chọn nhóm bệnh */}
            <View className="flex-row gap-2 mb-3">
              {CONDITION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setConditionType(opt.id)}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${
                    conditionType === opt.id
                      ? 'bg-primary border-primary'
                      : 'bg-card border-border'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      conditionType === opt.id ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-xs font-semibold text-foreground mb-1">Ngày đi khám</Text>
            <Input value={startDate} onChangeText={setStartDate} placeholder="dd/MM/yyyy" className="mb-3" />

            <Text className="text-xs font-semibold text-foreground mb-1">Tên đợt khám / Chẩn đoán</Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Ví dụ: Tái khám Huyết áp tháng 11"
              className="mb-3"
            />

            <View className="flex-row gap-2 mb-3">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-foreground mb-1">HA trên (SYS)</Text>
                <Input value={systolic} onChangeText={setSystolic} placeholder="125" keyboardType="numeric" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-foreground mb-1">HA dưới (DIA)</Text>
                <Input value={diastolic} onChangeText={setDiastolic} placeholder="80" keyboardType="numeric" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-foreground mb-1">Đường huyết</Text>
                <Input value={bloodSugar} onChangeText={setBloodSugar} placeholder="5.6" keyboardType="numeric" />
              </View>
            </View>

            <Text className="text-xs font-semibold text-foreground mb-1">
              Danh sách thuốc trong đơn (cách nhau bằng dấu phẩy hoặc xuống dòng)
            </Text>
            <Input
              value={medicationsText}
              onChangeText={setMedicationsText}
              placeholder="Ví dụ: Amlodipine 5mg (Sáng 1 viên), Vitamin B1 (Tối 1 viên)"
              multiline
              className="mb-3 min-h-[76px]"
            />

            {/* Bảng đối chiếu thay đổi thuốc so với đơn trước -> người dùng tích chọn xác nhận */}
            {(medDiff.added.length > 0 || medDiff.removed.length > 0) && (
              <Card className="p-3.5 mb-3 border-primary/30 bg-primary/5">
                <Text className="text-sm font-bold text-foreground mb-1">
                  Đối chiếu thuốc với đơn trước
                </Text>
                <Text className="text-xs text-muted-foreground mb-2.5">
                  Tích chọn các thuốc anh/chị muốn cập nhật vào Lịch nhắc uống thuốc:
                </Text>

                {medDiff.added.map((entry) => {
                  const checked = selectedAddKeys[entry.normalizedKey] ?? true;
                  return (
                    <TouchableOpacity
                      key={`add-${entry.normalizedKey}`}
                      onPress={() => toggleAddKey(entry.normalizedKey)}
                      className="flex-row items-center py-2 border-b border-border/40"
                    >
                      {checked ? (
                        <CheckSquare size={18} color="#0D9488" />
                      ) : (
                        <Square size={18} color="#94A3B8" />
                      )}
                      <View className="ml-2.5 flex-1">
                        <Text className="text-xs font-bold text-emerald-700">
                          + Thêm lịch nhắc: {entry.displayName}
                        </Text>
                        <Text className="text-[11px] text-muted-foreground">{entry.dosageHint}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {medDiff.removed.map((entry) => {
                  const checked = Boolean(selectedArchiveKeys[entry.normalizedKey]);
                  return (
                    <TouchableOpacity
                      key={`rem-${entry.normalizedKey}`}
                      onPress={() => toggleArchiveKey(entry.normalizedKey)}
                      className="flex-row items-center py-2 border-b border-border/40"
                    >
                      {checked ? (
                        <CheckSquare size={18} color="#EA580C" />
                      ) : (
                        <Square size={18} color="#94A3B8" />
                      )}
                      <View className="ml-2.5 flex-1">
                        <Text className="text-xs font-bold text-amber-700">
                          Ngừng nhắc thuốc cũ: {entry.displayName}
                        </Text>
                        <Text className="text-[11px] text-muted-foreground">
                          Không còn thấy trong đơn mới (chỉ chuyển sang Đã ngừng, giữ lịch sử)
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}

            <Text className="text-xs font-semibold text-foreground mb-1">Ghi chú / Hẹn tái khám</Text>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Ví dụ: Tái khám sau 1 tháng, nhịn ăn sáng xét nghiệm máu"
              className="mb-5"
            />

            <Button variant="default" className="w-full h-13 rounded-2xl bg-primary" onPress={handleSaveVisit}>
              <Text className="text-white font-bold text-base">Xác nhận & Lưu hồ sơ</Text>
            </Button>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal phóng to ảnh giấy khám / đơn thuốc */}
      <Modal visible={Boolean(zoomPhotoUri)} transparent animationType="fade" onRequestClose={() => setZoomPhotoUri(null)}>
        <View className="flex-1 bg-black/95 items-center justify-center p-4">
          <TouchableOpacity
            onPress={() => setZoomPhotoUri(null)}
            className="absolute top-12 right-5 z-10 h-11 w-11 rounded-full bg-white/20 items-center justify-center"
            accessibilityLabel="Đóng ảnh"
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {zoomPhotoUri && (
            <Image
              source={{ uri: zoomPhotoUri }}
              style={{ width: '100%', height: '80%' }}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}
