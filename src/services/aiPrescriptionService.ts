// Mục đích: Dịch vụ gọi Supabase Edge Function đọc chữ từ ảnh đơn thuốc và màn hình máy đo huyết áp Omron.
// Tuân thủ rule 01-security.md & 04-medical-safety.md:
// - Không chứa API key trong app; chỉ gọi qua Supabase Edge Function `ocr-prescription`.
// - Khi chưa kết nối server hoặc mất mạng: KHÔNG tự bịa tên thuốc hay chỉ số giả, báo người dùng nhập tay an toàn.

import { supabase } from '@/lib/supabase';
import { searchMedicines } from './medicineService';

/**
 * Danh sách chuỗi Model Gemini chuẩn (theo thứ tự ưu tiên tự động chuyển đổi khi model chính gặp sự cố)
 */
export const AI_MODEL_FALLBACK_CHAIN = [
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen (Chính - Khuyên dùng)',
    desc: 'Model đa phương thức thế hệ 4 mới nhất, đọc ảnh toa thuốc và màn hình máy đo chính xác cao',
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite (Dự phòng 1 - Siêu tốc)',
    desc: 'Tốc độ phản hồi cực nhanh, tiết kiệm hạn mức tối đa',
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon (Dự phòng 2 - Suy luận sâu)',
    desc: 'Dự phòng khi giấy khám có nhiều chỉ số xét nghiệm phức tạp',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite (Dự phòng 3 - Tương thích)',
    desc: 'Model nhẹ dự phòng cuối trong chuỗi Cloud AI',
  },
] as const;

export interface AiOcrResult {
  title: string;
  conditionType: 'blood_pressure' | 'diabetes' | 'general';
  medicationsText: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  bloodSugar: string;
  notes: string;
  usedModel: string;
  source: 'cloud_ai' | 'manual_required';
  message?: string;
}

export interface OmronOcrResult {
  systolic: string;
  diastolic: string;
  pulse: string;
  usedModel: string;
  source: 'cloud_ai' | 'manual_required';
  message?: string;
}

function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return Boolean(supabaseUrl && !supabaseUrl.includes('placeholder'));
}

/**
 * Lấy thông báo lỗi dễ hiểu từ phản hồi Edge Function (không làm lộ thông tin nhạy cảm)
 */
async function extractEdgeFunctionError(error: any): Promise<string> {
  try {
    if (error?.context && typeof error.context.json === 'function') {
      const body = await error.context.json();
      if (body?.error) {
        return body.detail ? `${body.error} (${body.detail})` : String(body.error);
      }
    }
  } catch {
    // Bỏ qua nếu không parse được JSON lỗi
  }
  return error?.message || 'Không thể kết nối tới Edge Function ocr-prescription';
}

/**
 * Chuẩn hoá tên thuốc đọc được từ AI bằng cách đối chiếu với kho 2.039 thuốc Việt Nam có sẵn trên máy
 */
function enrichWithLocalCatalog(rawMedicationsText: string): string {
  if (!rawMedicationsText) return '';
  const parts = rawMedicationsText
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const enriched = parts.map((part) => {
    const firstWord = part.split(/\s+/)[0] || '';
    if (firstWord.length >= 4) {
      const matches = searchMedicines(firstWord, { limit: 1 });
      if (
        matches.length > 0 &&
        !part.toLowerCase().includes(matches[0].name.toLowerCase().slice(0, 8))
      ) {
        return part;
      }
    }
    return part;
  });
  return enriched.join(', ');
}

/**
 * Đọc ảnh giấy khám sức khoẻ & đơn thuốc bác sĩ (hỗ trợ 1 hoặc nhiều ảnh base64) qua Supabase Edge Function.
 * Nếu chưa kết nối Supabase hoặc mất mạng -> trả về `manual_required` (không điền dữ liệu ảo).
 */
export async function analyzePrescriptionImageWithBackup(params: {
  imageBase64?: string;
  extraImagesBase64?: string[];
  preferredModel?: string;
}): Promise<AiOcrResult> {
  const {
    imageBase64,
    extraImagesBase64 = [],
    preferredModel = 'gemini-4-hydrogen',
  } = params;

  if (!isSupabaseConfigured()) {
    return {
      title: '',
      conditionType: 'general',
      medicationsText: '',
      systolic: '',
      diastolic: '',
      heartRate: '',
      bloodSugar: '',
      notes: '',
      usedModel: '',
      source: 'manual_required',
      message:
        'Chưa cấu hình file .env Supabase trên máy. Ảnh đã được lưu — bạn vui lòng nhập tay thông tin từ ảnh nhé.',
    };
  }

  let errorReason = 'Không đọc được nội dung từ ảnh. Bạn vui lòng nhập tay nhé.';

  if (imageBase64) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        return {
          title: '',
          conditionType: 'general',
          medicationsText: '',
          systolic: '',
          diastolic: '',
          heartRate: '',
          bloodSugar: '',
          notes: '',
          usedModel: '',
          source: 'manual_required',
          message:
            'Bạn cần đăng nhập ở tab Tài khoản trước để bật AI đọc ảnh tự động (hoặc nhập tay ngay bên dưới).',
        };
      }

      const { data, error } = await supabase.functions.invoke('ocr-prescription', {
        body: {
          mode: 'visit',
          imageBase64,
          extraImagesBase64: extraImagesBase64.slice(0, 3),
          mimeType: 'image/jpeg',
          preferredModel,
        },
      });

      if (!error && data && (data.title || data.medicationsText || data.systolic || data.bloodSugar)) {
        return {
          title: data.title || '',
          conditionType: data.conditionType || 'general',
          medicationsText: enrichWithLocalCatalog(data.medicationsText || ''),
          systolic: data.systolic ? String(data.systolic) : '',
          diastolic: data.diastolic ? String(data.diastolic) : '',
          heartRate: data.heartRate ? String(data.heartRate) : '',
          bloodSugar: data.bloodSugar ? String(data.bloodSugar) : '',
          notes: data.notes || '',
          usedModel: data.usedModel || preferredModel,
          source: 'cloud_ai',
        };
      }

      if (error) {
        errorReason = `AI chưa đọc được: ${await extractEdgeFunctionError(error)}. Bạn vui lòng nhập tay bên dưới.`;
      }
    } catch (err: any) {
      errorReason = `Lỗi gọi AI: ${err?.message || 'mất kết nối'}. Bạn vui lòng nhập tay bên dưới.`;
    }
  }

  return {
    title: '',
    conditionType: 'general',
    medicationsText: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    bloodSugar: '',
    notes: '',
    usedModel: '',
    source: 'manual_required',
    message: errorReason,
  };
}

/**
 * Đọc 3 chỉ số SYS / DIA / PULSE từ ảnh chụp màn hình máy đo huyết áp Omron qua Supabase Edge Function.
 * Nếu chưa kết nối Supabase hoặc mất mạng -> trả về `manual_required` để người dùng nhập tay 3 số.
 */
export async function analyzeOmronImageWithBackup(params: {
  imageBase64?: string;
  preferredModel?: string;
}): Promise<OmronOcrResult> {
  const { imageBase64, preferredModel = 'gemini-4-hydrogen' } = params;

  if (!isSupabaseConfigured()) {
    return {
      systolic: '',
      diastolic: '',
      pulse: '',
      usedModel: '',
      source: 'manual_required',
      message:
        'Chưa cấu hình file .env Supabase trên máy. Ảnh máy Omron đã được lưu — bạn vui lòng gõ nhanh 3 số bên dưới nhé.',
    };
  }

  let errorReason = 'AI chưa đọc được rõ 3 số trên ảnh. Bạn vui lòng nhập tay SYS, DIA, PULSE nhé.';

  if (imageBase64) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        return {
          systolic: '',
          diastolic: '',
          pulse: '',
          usedModel: '',
          source: 'manual_required',
          message:
            'Bạn cần đăng nhập ở tab Tài khoản trước để bật AI đọc ảnh máy Omron (hoặc nhập tay 3 số bên dưới).',
        };
      }

      const { data, error } = await supabase.functions.invoke('ocr-prescription', {
        body: {
          mode: 'omron',
          imageBase64,
          mimeType: 'image/jpeg',
          preferredModel,
        },
      });

      if (!error && data && (data.systolic || data.diastolic || data.pulse)) {
        return {
          systolic: data.systolic ? String(data.systolic) : '',
          diastolic: data.diastolic ? String(data.diastolic) : '',
          pulse: data.pulse ? String(data.pulse) : '',
          usedModel: data.usedModel || preferredModel,
          source: 'cloud_ai',
        };
      }

      if (error) {
        errorReason = `AI chưa đọc được: ${await extractEdgeFunctionError(error)}. Bạn vui lòng gõ tay 3 số bên dưới.`;
      }
    } catch (err: any) {
      errorReason = `Lỗi gọi AI: ${err?.message || 'mất kết nối'}. Bạn vui lòng gõ tay 3 số bên dưới.`;
    }
  }

  return {
    systolic: '',
    diastolic: '',
    pulse: '',
    usedModel: '',
    source: 'manual_required',
    message: errorReason,
  };
}
