// Mục đích: Tab đo huyết áp & nhịp tim từ máy đo Omron, đánh giá sơ bộ theo chuẩn Bộ Y tế VN và so sánh lần đo trước.

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import {
  Camera,
  Image as ImageIcon,
  HeartPulse,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppAlert as Alert } from '@/components/ui/app-dialog';
import { useAppStore } from '@/context/AppContext';
import { analyzeOmronImageWithBackup } from '@/services/aiPrescriptionService';
import {
  evaluateBloodPressureVN,
  evaluateHeartRateVN,
  MEDICAL_DISCLAIMER_VN,
} from './standards';
import { prepareHealthPhoto, getSeverityVisual } from './imageHelper';
import type { OmronReading } from '@/types';

interface OmronTabProps {
  autoCapture?: boolean;
}

export function OmronTab({ autoCapture = false }: OmronTabProps) {
  const { omronReadings, addOmronReading, deleteOmronReading, reminderSettings } = useAppStore();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [notes, setNotes] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  const sysNum = parseInt(systolic, 10);
  const diaNum = parseInt(diastolic, 10);
  const pulseNum = parseInt(pulse, 10);

  const liveBpEval = useMemo(() => {
    if (!isNaN(sysNum) && !isNaN(diaNum) && sysNum >= 40 && sysNum <= 280 && diaNum >= 30 && diaNum <= 180) {
      return evaluateBloodPressureVN(sysNum, diaNum);
    }
    return null;
  }, [sysNum, diaNum]);

  const livePulseEval = useMemo(() => {
    if (!isNaN(pulseNum) && pulseNum >= 30 && pulseNum <= 220) {
      return evaluateHeartRateVN(pulseNum);
    }
    return null;
  }, [pulseNum]);

  const processSelectedPhoto = async (rawUri: string) => {
    setIsScanning(true);
    setOcrNotice(null);
    try {
      const prepared = await prepareHealthPhoto(rawUri, true);
      setPhotoUri(prepared.uri);

      const ocr = await analyzeOmronImageWithBackup({
        imageBase64: prepared.base64,
        preferredModel: reminderSettings.preferredAiModel,
      });

      if (ocr.source === 'cloud_ai') {
        if (ocr.systolic) setSystolic(ocr.systolic);
        if (ocr.diastolic) setDiastolic(ocr.diastolic);
        if (ocr.pulse) setPulse(ocr.pulse);
        setOcrNotice(`AI đã đọc từ ảnh (${ocr.usedModel}). Hãy kiểm tra lại 3 số trước khi lưu.`);
      } else {
        setOcrNotice(ocr.message || 'Vui lòng nhập 3 số SYS, DIA, PULSE từ màn hình máy đo.');
      }
    } catch {
      setOcrNotice('Không thể đọc ảnh tự động. Bạn vui lòng nhập tay 3 số bên dưới.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCaptureOmron = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Cần quyền Camera', 'Vui lòng cấp quyền máy ảnh để chụp màn hình máy đo Omron.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.95 });
      if (!res.canceled && res.assets[0]?.uri) {
        await processSelectedPhoto(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể mở máy ảnh lúc này.');
    }
  };

  const handlePickOmronImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.95,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        await processSelectedPhoto(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể mở thư viện ảnh.');
    }
  };

  useEffect(() => {
    if (!autoCapture) return;
    // Mở camera sau khi màn hình đã mount xong để tránh xung đột vòng đời render
    const timer = setTimeout(() => {
      handleCaptureOmron();
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCapture]);

  const handleSaveReading = () => {
    if (isNaN(sysNum) || isNaN(diaNum) || isNaN(pulseNum)) {
      Alert.alert('Thiếu chỉ số', 'Vui lòng nhập đủ 3 số: SYS (Tâm thu), DIA (Tâm trương) và PULSE (Nhịp tim).');
      return;
    }
    if (sysNum < 50 || sysNum > 280 || diaNum < 30 || diaNum > 180 || pulseNum < 30 || pulseNum > 220) {
      Alert.alert('Số đo chưa hợp lệ', 'Vui lòng kiểm tra lại 3 chỉ số trên màn hình máy đo.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    addOmronReading({
      systolic: sysNum,
      diastolic: diaNum,
      pulse: pulseNum,
      measuredAt: new Date().toISOString(),
      imageUri: photoUri,
      notes: notes.trim() || undefined,
    });

    setPhotoUri(null);
    setSystolic('');
    setDiastolic('');
    setPulse('');
    setNotes('');
    setOcrNotice(null);
    Alert.alert('Đã lưu kết quả đo!', 'Chỉ số huyết áp và nhịp tim đã được lưu vào nhật ký sức khoẻ.');
  };

  const handleConfirmDelete = (item: OmronReading) => {
    Alert.alert('Xoá lần đo này?', `Xoá kết quả ${item.systolic}/${item.diastolic} mmHg?`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: () => deleteOmronReading(item.id) },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 px-4 pt-3"
      contentContainerStyle={{ paddingBottom: 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Khu vực chụp ảnh màn hình máy Omron & nhập 3 số lớn */}
      <Card className="p-4 mb-4 border-primary/30 bg-card">
        <View className="flex-row items-center mb-3">
          <HeartPulse size={20} color="#0D9488" />
          <Text className="text-base font-bold text-foreground ml-2">
            Ghi nhận từ máy đo Omron
          </Text>
        </View>

        <View className="flex-row gap-2.5 mb-3">
          <Button
            variant="default"
            className="flex-1 h-12 rounded-2xl bg-primary"
            onPress={handleCaptureOmron}
            disabled={isScanning}
          >
            <View className="flex-row items-center">
              <Camera size={18} color="#FFFFFF" />
              <Text className="text-white font-bold text-sm ml-2">Chụp máy Omron</Text>
            </View>
          </Button>

          <Button
            variant="outline"
            className="h-12 px-4 rounded-2xl border-primary/40"
            onPress={handlePickOmronImage}
            disabled={isScanning}
          >
            <View className="flex-row items-center">
              <ImageIcon size={18} color="#0D9488" />
              <Text className="text-primary font-semibold text-sm ml-1.5">Album</Text>
            </View>
          </Button>
        </View>

        {photoUri && (
          <View className="mb-3 rounded-2xl overflow-hidden border border-border">
            <Image
              source={{ uri: photoUri }}
              style={{ width: '100%', height: 150 }}
              contentFit="cover"
            />
          </View>
        )}

        {isScanning && (
          <View className="flex-row items-center bg-primary/10 p-3 rounded-xl mb-3">
            <ActivityIndicator size="small" color="#0D9488" />
            <Text className="text-sm text-primary font-semibold ml-2.5">
              Đang đọc 3 số SYS, DIA, PULSE từ ảnh...
            </Text>
          </View>
        )}

        {ocrNotice && !isScanning && (
          <View className="flex-row items-start bg-muted/70 p-3 rounded-xl mb-3">
            <Info size={16} color="#0D9488" style={{ marginTop: 2 }} />
            <Text className="text-xs text-foreground ml-2 flex-1 leading-relaxed">
              {ocrNotice}
            </Text>
          </View>
        )}

        {/* 3 ô nhập số cỡ lớn kèm tên tiếng Việt dễ hiểu cho người lớn tuổi */}
        <View className="flex-row gap-2 mb-2.5">
          <View className="flex-1">
            <Text className="text-xs font-bold text-foreground text-center">
              Huyết áp trên
            </Text>
            <Text className="text-[11px] text-muted-foreground mb-1 text-center">
              SYS (mmHg)
            </Text>
            <Input
              value={systolic}
              onChangeText={setSystolic}
              placeholder="118"
              keyboardType="numeric"
              className="h-14 text-center text-xl font-bold"
            />
          </View>

          <View className="flex-1">
            <Text className="text-xs font-bold text-foreground text-center">
              Huyết áp dưới
            </Text>
            <Text className="text-[11px] text-muted-foreground mb-1 text-center">
              DIA (mmHg)
            </Text>
            <Input
              value={diastolic}
              onChangeText={setDiastolic}
              placeholder="78"
              keyboardType="numeric"
              className="h-14 text-center text-xl font-bold"
            />
          </View>

          <View className="flex-1">
            <Text className="text-xs font-bold text-foreground text-center">
              Nhịp tim
            </Text>
            <Text className="text-[11px] text-muted-foreground mb-1 text-center">
              PULSE (/phút)
            </Text>
            <Input
              value={pulse}
              onChangeText={setPulse}
              placeholder="70"
              keyboardType="numeric"
              className="h-14 text-center text-xl font-bold"
            />
          </View>
        </View>

        {/* Chú thích dễ hiểu cho ông bà/người lớn tuổi về 3 chỉ số trên máy Omron */}
        <View className="bg-muted/50 rounded-xl px-3 py-2.5 mb-3 border border-border/50">
          <Text className="text-xs font-bold text-foreground mb-1">
            Cách đọc 3 số trên máy đo Omron:
          </Text>
          <Text className="text-xs text-muted-foreground leading-relaxed">
            • <Text className="font-bold text-foreground">SYS (Huyết áp trên / Tâm thu):</Text> số trên cùng — lực tim bóp đẩy máu đi (ổn định &lt; 130).
          </Text>
          <Text className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            • <Text className="font-bold text-foreground">DIA (Huyết áp dưới / Tâm trương):</Text> số ở giữa — áp lực lúc tim nghỉ (ổn định &lt; 85).
          </Text>
          <Text className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            • <Text className="font-bold text-foreground">PULSE (Nhịp tim):</Text> số dưới cùng — số lần tim đập trong 1 phút (bình thường 60–100).
          </Text>
        </View>

        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="Ghi chú thêm (vd: đo buổi sáng sau khi nghỉ 5 phút)..."
          className="mb-3 text-sm"
        />

        {/* Khung đánh giá sơ bộ ngay lập tức theo chuẩn Bộ Y tế VN */}
        {liveBpEval && (
          <View
            style={{
              backgroundColor: getSeverityVisual(liveBpEval.severity).bg,
              borderColor: getSeverityVisual(liveBpEval.severity).border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <View className="flex-row items-center">
              {liveBpEval.severity === 'optimal' || liveBpEval.severity === 'normal' ? (
                <CheckCircle2 size={18} color={getSeverityVisual(liveBpEval.severity).text} />
              ) : (
                <AlertTriangle size={18} color={getSeverityVisual(liveBpEval.severity).text} />
              )}
              <Text
                style={{ color: getSeverityVisual(liveBpEval.severity).text }}
                className="text-base font-bold ml-2 flex-1"
              >
                {liveBpEval.label}
              </Text>
            </View>
            <Text className="text-xs text-foreground mt-1.5 leading-relaxed">
              {liveBpEval.summary}
            </Text>
            {liveBpEval.homeNote && (
              <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-1">
                • {liveBpEval.homeNote}
              </Text>
            )}
            {livePulseEval && (
              <Text className="text-xs text-foreground mt-1.5">
                • Nhịp tim ({pulseNum}/phút): <Text className="font-bold">{livePulseEval.label}</Text> — {livePulseEval.summary}
              </Text>
            )}
          </View>
        )}

        <Button
          variant="default"
          className="w-full h-12 rounded-2xl bg-primary"
          onPress={handleSaveReading}
        >
          <Text className="text-white font-bold text-base">Lưu kết quả đo</Text>
        </Button>
      </Card>

      {/* Cảnh báo y tế cố định (Rule 04) */}
      <View className="flex-row items-start bg-muted/60 rounded-2xl p-3 mb-5 border border-border/60">
        <Info size={16} color="#64748B" style={{ marginTop: 2 }} />
        <Text className="text-xs text-muted-foreground ml-2 flex-1 leading-relaxed">
          {MEDICAL_DISCLAIMER_VN}
        </Text>
      </View>

      {/* Lịch sử đo huyết áp Omron */}
      <Text className="text-base font-bold text-foreground mb-3">
        Lịch sử đo gần đây ({omronReadings.length})
      </Text>

      {omronReadings.length === 0 ? (
        <Card className="items-center justify-center py-10 px-4 border-border/70">
          <Activity size={38} color="#94A3B8" strokeWidth={1.5} />
          <Text className="text-base font-semibold text-foreground mt-3">
            Chưa có lần đo nào
          </Text>
          <Text className="text-xs text-muted-foreground text-center mt-1">
            Chụp màn hình máy đo Omron hoặc nhập 3 số ở trên để theo dõi huyết áp mỗi ngày.
          </Text>
        </Card>
      ) : (
        omronReadings.map((item, idx) => {
          const bpEval = evaluateBloodPressureVN(item.systolic, item.diastolic);
          const pulseEval = evaluateHeartRateVN(item.pulse);
          const visual = getSeverityVisual(bpEval.severity);
          const prev = omronReadings[idx + 1];
          const sysDiff = prev ? item.systolic - prev.systolic : null;

          return (
            <Card key={item.id} className="p-4 mb-3 border-border/80">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-semibold text-muted-foreground">
                  {format(new Date(item.measuredAt), 'HH:mm • dd/MM/yyyy')}
                </Text>
                <TouchableOpacity
                  onPress={() => handleConfirmDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Xoá lần đo"
                >
                  <Trash2 size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-bold text-foreground">
                    {item.systolic}/{item.diastolic}{' '}
                    <Text className="text-xs font-medium text-muted-foreground">mmHg</Text>
                  </Text>
                  <Text className="text-sm text-muted-foreground mt-0.5">
                    Nhịp tim: <Text className="font-bold text-foreground">{item.pulse}</Text> /phút ({pulseEval.label})
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: visual.bg,
                    borderColor: visual.border,
                    borderWidth: 1,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: visual.text }} className="text-xs font-bold">
                    {visual.badgeLabel}
                  </Text>
                </View>
              </View>

              <Text style={{ color: visual.text }} className="text-xs font-semibold mt-2">
                {bpEval.label}
              </Text>

              {sysDiff !== null && sysDiff !== 0 && (
                <View className="flex-row items-center mt-1.5">
                  {sysDiff < 0 ? (
                    <TrendingDown size={14} color="#10B981" />
                  ) : (
                    <TrendingUp size={14} color="#EA580C" />
                  )}
                  <Text className="text-xs text-muted-foreground ml-1">
                    Tâm thu {sysDiff > 0 ? `tăng +${sysDiff}` : `giảm ${Math.abs(sysDiff)}`} mmHg so với lần đo trước
                  </Text>
                </View>
              )}

              {item.notes ? (
                <Text className="text-xs text-muted-foreground mt-1.5">Ghi chú: {item.notes}</Text>
              ) : null}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}
