// Mục đích: Hàm thuần phân loại chỉ số huyết áp, nhịp tim, đường huyết theo chuẩn Bộ Y tế VN và so sánh thay đổi thuốc giữa 2 đơn.

import { removeVietnameseTones } from '@/services/medicineService';

export type HealthSeverity = 'optimal' | 'normal' | 'caution' | 'high' | 'danger' | 'low';

export interface HealthEvaluation {
  severity: HealthSeverity;
  label: string;
  summary: string;
  homeNote?: string;
  isEmergencyWarning?: boolean;
}

export interface ParsedMedicationEntry {
  raw: string;
  displayName: string;
  dosageHint: string;
  normalizedKey: string;
}

export interface MedicationDiffResult {
  added: ParsedMedicationEntry[];
  removed: ParsedMedicationEntry[];
  unchanged: ParsedMedicationEntry[];
}

export const MEDICAL_DISCLAIMER_VN =
  'Chỉ mang tính hỗ trợ theo dõi tại nhà theo bảng ngưỡng tham khảo Bộ Y tế, không thay thế chẩn đoán của bác sĩ. Nếu có triệu chứng bất thường (đau ngực, khó thở, chóng mặt...), hãy đi khám ngay.';

/**
 * Đánh giá Huyết áp theo Hướng dẫn của Bộ Y tế Việt Nam (QĐ 3192/QĐ-BYT)
 * kèm ghi chú ngưỡng đo tại nhà của Hội Tim mạch học Việt Nam (VNHA: ≥ 135/85 mmHg).
 */
export function evaluateBloodPressureVN(
  systolic: number,
  diastolic: number
): HealthEvaluation {
  const isAboveHomeThreshold = systolic >= 135 || diastolic >= 85;
  const homeNote = isAboveHomeThreshold
    ? 'Lưu ý đo tại nhà (VNHA): ngưỡng cần theo dõi tăng huyết áp tại nhà là ≥ 135/85 mmHg.'
    : undefined;

  if (systolic < 90 || diastolic < 60) {
    return {
      severity: 'low',
      label: 'Huyết áp thấp',
      summary: 'Chỉ số thấp hơn ngưỡng 90/60 mmHg. Nên nghỉ ngơi, uống nước ấm; nếu hoa mắt hoặc choáng cần đi khám.',
    };
  }

  if (systolic >= 180 || diastolic >= 110) {
    return {
      severity: 'danger',
      label: 'Tăng huyết áp Độ 3 (Rất cao)',
      summary:
        'Ngồi nghỉ yên 5 phút rồi đo lại. Nếu vẫn rất cao hoặc kèm đau ngực, khó thở, đau đầu dữ dội, tê yếu tay chân — hãy đi cấp cứu ngay!',
      homeNote,
      isEmergencyWarning: true,
    };
  }

  if (systolic >= 160 || diastolic >= 100) {
    return {
      severity: 'high',
      label: 'Tăng huyết áp Độ 2',
      summary: 'Huyết áp cao rõ rệt theo chuẩn Bộ Y tế. Nên liên hệ bác sĩ hoặc đi khám sớm, không tự ý bỏ thuốc.',
      homeNote,
    };
  }

  if (systolic >= 140 || diastolic >= 90) {
    return {
      severity: 'high',
      label: 'Tăng huyết áp Độ 1',
      summary: 'Vượt ngưỡng chuẩn Bộ Y tế (140/90 mmHg). Cần theo dõi đều đặn và trao đổi với bác sĩ điều trị.',
      homeNote,
    };
  }

  if (systolic >= 130 || diastolic >= 85) {
    return {
      severity: 'caution',
      label: 'Bình thường cao (Cần theo dõi)',
      summary: 'Chỉ số ở ngưỡng cận cao. Nên hạn chế ăn mặn, nghỉ ngơi đều và đo kiểm tra lại sáng/tối.',
      homeNote,
    };
  }

  if (systolic >= 120 || diastolic >= 80) {
    return {
      severity: 'normal',
      label: 'Huyết áp bình thường',
      summary: 'Chỉ số trong giới hạn ổn định theo chuẩn Bộ Y tế. Tiếp tục duy trì chế độ sinh hoạt hiện tại.',
    };
  }

  return {
    severity: 'optimal',
    label: 'Huyết áp tối ưu',
    summary: 'Chỉ số rất tốt (< 120/80 mmHg theo chuẩn Bộ Y tế).',
  };
}

/**
 * Đánh giá Nhịp tim lúc nghỉ ở người trưởng thành (chuẩn lâm sàng 60–100 lần/phút).
 */
export function evaluateHeartRateVN(pulse: number): HealthEvaluation {
  if (pulse < 50) {
    return {
      severity: 'danger',
      label: 'Nhịp tim rất chậm',
      summary: 'Dưới 50 lần/phút. Nếu kèm chóng mặt, mệt lả hoặc khó thở, cần đi khám sớm.',
      isEmergencyWarning: true,
    };
  }

  if (pulse < 60) {
    return {
      severity: 'low',
      label: 'Nhịp tim chậm',
      summary: 'Thấp hơn 60 lần/phút. Theo dõi thêm khi nghỉ; báo bác sĩ nếu thấy mệt hoặc choáng.',
    };
  }

  if (pulse > 120) {
    return {
      severity: 'danger',
      label: 'Nhịp tim rất nhanh',
      summary: 'Trên 120 lần/phút lúc nghỉ. Nên ngồi nghỉ 5 phút đo lại; nếu hồi hộp/khó thở hãy đi khám ngay.',
      isEmergencyWarning: true,
    };
  }

  if (pulse > 100) {
    return {
      severity: 'high',
      label: 'Nhịp tim nhanh',
      summary: 'Cao hơn 100 lần/phút. Có thể do vừa vận động, căng thẳng hoặc cà phê — nên nghỉ 5 phút rồi đo lại.',
    };
  }

  return {
    severity: 'normal',
    label: 'Nhịp tim bình thường',
    summary: 'Trong ngưỡng ổn định 60–100 lần/phút.',
  };
}

/**
 * Đánh giá Đường huyết lúc đói theo Hướng dẫn Bộ Y tế Việt Nam (QĐ 5481/QĐ-BYT).
 */
export function evaluateFastingBloodSugarVN(mmolPerL: number): HealthEvaluation {
  if (mmolPerL < 3.9) {
    return {
      severity: 'danger',
      label: 'Hạ đường huyết',
      summary: 'Thấp hơn 3.9 mmol/L. Nếu run tay, vã mồ hôi hoặc choáng, cần xử trí ngay và báo người nhà/bác sĩ.',
      isEmergencyWarning: true,
    };
  }

  if (mmolPerL <= 5.5) {
    return {
      severity: 'optimal',
      label: 'Đường huyết bình thường',
      summary: 'Trong ngưỡng an toàn 3.9 – 5.5 mmol/L (lúc đói, chuẩn Bộ Y tế).',
    };
  }

  if (mmolPerL <= 6.9) {
    return {
      severity: 'caution',
      label: 'Tiền đái tháo đường (Cần theo dõi)',
      summary: 'Trong vùng 5.6 – 6.9 mmol/L lúc đói. Nên kiểm soát tinh bột/đồ ngọt và tái khám theo hẹn.',
    };
  }

  return {
    severity: 'high',
    label: 'Đường huyết cao',
    summary: 'Từ 7.0 mmol/L trở lên lúc đói (ngưỡng đái tháo đường theo QĐ 5481/QĐ-BYT). Cần theo dõi cùng bác sĩ.',
  };
}

/**
 * Tách chuỗi tên thuốc trong đơn thành danh sách chuẩn hoá để đối chiếu giữa đơn tháng trước và tháng này.
 */
export function parseMedicationNamesFromText(medicationsText?: string): ParsedMedicationEntry[] {
  if (!medicationsText || !medicationsText.trim()) return [];

  const seen = new Set<string>();
  const results: ParsedMedicationEntry[] = [];

  const parts = medicationsText
    .split(/[,;\n]+/)
    .map((part) => part.replace(/^[\s•\-*]+/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter((part) => part.length >= 2);

  for (const raw of parts) {
    // Tách tên thuốc và hướng dẫn liều nằm trong ngoặc hoặc sau dấu " - "
    let displayName = raw;
    let dosageHint = '1 viên - Theo đơn bác sĩ';

    const parenMatch = raw.match(/^([^(]+)\(([^)]+)\)/);
    const dashParts = raw.split(/\s+[-–—]\s+/);

    if (parenMatch) {
      displayName = parenMatch[1].trim();
      dosageHint = parenMatch[2].trim();
    } else if (dashParts.length >= 2) {
      displayName = dashParts[0].trim();
      dosageHint = dashParts.slice(1).join(' - ').trim();
    }

    // Chuẩn hoá khoá so sánh không dấu, giữ tên hoạt chất/biệt dược chính (bỏ bớt chữ thừa cuối)
    const normalizedKey = removeVietnameseTones(displayName)
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalizedKey || seen.has(normalizedKey)) continue;
    seen.add(normalizedKey);

    results.push({
      raw,
      displayName: displayName || raw,
      dosageHint: dosageHint || '1 viên - Theo đơn bác sĩ',
      normalizedKey,
    });
  }

  return results;
}

/**
 * So sánh đơn thuốc mới với đơn tháng trước để tìm thuốc mới thêm, thuốc không còn dùng và thuốc giữ nguyên.
 */
export function comparePrescriptionMedications(
  previousText?: string,
  currentText?: string
): MedicationDiffResult {
  const prevList = parseMedicationNamesFromText(previousText);
  const currList = parseMedicationNamesFromText(currentText);

  const prevKeys = new Set(prevList.map((item) => item.normalizedKey));
  const currKeys = new Set(currList.map((item) => item.normalizedKey));

  const added = currList.filter((item) => !prevKeys.has(item.normalizedKey));
  const removed = prevList.filter((item) => !currKeys.has(item.normalizedKey));
  const unchanged = currList.filter((item) => prevKeys.has(item.normalizedKey));

  return { added, removed, unchanged };
}
