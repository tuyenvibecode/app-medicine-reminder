// Mục đích: Tiện ích xử lý ảnh (xoá EXIF GPS, tạo base64 gửi OCR) và bảng màu trạng thái chỉ số sức khoẻ.

import * as ImageManipulator from 'expo-image-manipulator';
import type { HealthSeverity } from './standards';

export interface PreparedHealthPhoto {
  uri: string; // Ảnh lưu trên máy (đã xoá EXIF GPS, giữ độ nét cao để xem lại)
  base64?: string; // Bản nén nhẹ vừa đủ để gửi lên Edge Function OCR (không vượt giới hạn dung lượng)
}

/**
 * Xoá thông tin vị trí EXIF GPS trên ảnh trước khi lưu (Rule 01-security.md).
 * Đồng thời tạo bản base64 gọn nhẹ (~1280px) nếu cần gửi lên AI đọc chữ/số.
 */
export async function prepareHealthPhoto(
  rawUri: string,
  withOcrBase64 = true
): Promise<PreparedHealthPhoto> {
  try {
    const cleanHighRes = await ImageManipulator.manipulateAsync(rawUri, [], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    if (!withOcrBase64) {
      return { uri: cleanHighRes.uri };
    }

    const ocrCopy = await ImageManipulator.manipulateAsync(
      cleanHighRes.uri,
      [{ resize: { width: 1280 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      uri: cleanHighRes.uri,
      base64: ocrCopy.base64,
    };
  } catch {
    return { uri: rawUri };
  }
}

export interface SeverityVisual {
  bg: string;
  border: string;
  text: string;
  badgeLabel: string;
}

/**
 * Trả về bảng màu trực quan có độ tương phản tốt cho từng mức đánh giá chỉ số sức khoẻ.
 */
export function getSeverityVisual(severity: HealthSeverity): SeverityVisual {
  switch (severity) {
    case 'optimal':
    case 'normal':
      return {
        bg: 'rgba(16, 185, 129, 0.10)',
        border: 'rgba(16, 185, 129, 0.35)',
        text: '#047857',
        badgeLabel: 'Ổn định',
      };
    case 'caution':
      return {
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.40)',
        text: '#B45309',
        badgeLabel: 'Cần theo dõi',
      };
    case 'low':
      return {
        bg: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.40)',
        text: '#1D4ED8',
        badgeLabel: 'Thấp',
      };
    case 'high':
      return {
        bg: 'rgba(234, 88, 12, 0.12)',
        border: 'rgba(234, 88, 12, 0.40)',
        text: '#C2410C',
        badgeLabel: 'Cao',
      };
    case 'danger':
      return {
        bg: 'rgba(239, 68, 68, 0.14)',
        border: 'rgba(239, 68, 68, 0.50)',
        text: '#B91C1C',
        badgeLabel: 'Cảnh báo cao',
      };
  }
}
