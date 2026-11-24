// Mục đích: Supabase Edge Function đọc chữ từ ảnh đơn thuốc, giấy khám (nhiều ảnh) và màn hình máy đo huyết áp Omron bằng Gemini API.
// Tuân thủ rule 01-security.md & 04-medical-safety.md:
// 1. Khoá GEMINI_API_KEY chỉ nằm trong Supabase Secrets trên server, tuyệt đối không nằm trong APK.
// 2. Hỗ trợ chuẩn Authorization Key mới của Google AI Studio (bắt đầu bằng "AQ.") qua header x-goog-api-key (miễn phí, không cần Billing Vertex AI).
// 3. Không ghi log nội dung ảnh y tế nhạy cảm của người dùng. AI chỉ trích xuất chữ/số, không tự chẩn đoán.

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Chuỗi model đa phương thức ổn định trên Gemini API (ưu tiên các bản Flash-Lite siêu tốc, ít quá tải 503)
const DEFAULT_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-4-hydrogen',
  'gemini-4-argon',
];

const VISIT_SYSTEM_PROMPT = `Bạn là trợ lý đọc chữ (OCR) trên ảnh giấy khám bệnh và đơn thuốc tiếng Việt.
Chỉ đọc chữ và số thực tế có trên ảnh, KHÔNG tự bịa tên thuốc, chỉ số hay lời khuyên y tế.
Trả về JSON thuần (không dùng markdown code block) theo đúng cấu trúc:
{
  "title": "Tên loại bệnh hoặc đợt khám (ví dụ: Khám Huyết áp & Tim mạch)",
  "conditionType": "blood_pressure" | "diabetes" | "general",
  "medicationsText": "Danh sách các thuốc và liều dùng đọc được, cách nhau bởi dấu phẩy",
  "systolic": 130,
  "diastolic": 85,
  "heartRate": 72,
  "bloodSugar": 5.8,
  "notes": "Ghi chú ngày tái khám hoặc lời dặn ghi trên giấy"
}
Nếu một chỉ số không có trên ảnh, trả về null cho trường đó.`;

const OMRON_SYSTEM_PROMPT = `Bạn là trợ lý đọc số trên màn hình máy đo huyết áp điện tử (ví dụ Omron).
Chỉ đọc đúng 3 số hiển thị trên màn hình: SYS (huyết áp tâm thu), DIA (huyết áp tâm trương), PULSE (nhịp tim).
KHÔNG tự bịa số nếu ảnh mờ không đọc được (trả về null).
Trả về JSON thuần (không dùng markdown code block):
{
  "systolic": 118,
  "diastolic": 78,
  "pulse": 70
}`;

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // 1. Xác thực JWT thật với Supabase Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Thiếu thông tin xác thực JWT hợp lệ' }), {
        status: 401,
        headers: CORS_HEADERS,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (supabaseUrl && supabaseAnonKey) {
      const userCheckRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: authHeader,
          apikey: supabaseAnonKey,
        },
      });
      if (!userCheckRes.ok) {
        return new Response(
          JSON.stringify({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' }),
          { status: 401, headers: CORS_HEADERS }
        );
      }
    }

    const apiKey = (Deno.env.get('GEMINI_API_KEY') || '').trim();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Chưa cấu hình GEMINI_API_KEY trong Supabase Secrets' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const body = await req.json();
    const {
      mode = 'visit',
      imageBase64,
      extraImagesBase64 = [],
      mimeType = 'image/jpeg',
      preferredModel,
    } = body || {};

    // 2. Kiểm tra định dạng & giới hạn kích thước ảnh để chống lạm dụng
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return new Response(JSON.stringify({ error: 'Định dạng ảnh không được hỗ trợ' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'Thiếu dữ liệu ảnh cần đọc' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const validExtras: string[] = Array.isArray(extraImagesBase64)
      ? extraImagesBase64
          .filter((img): img is string => typeof img === 'string' && img.length > 0)
          .slice(0, 3)
      : [];

    const allImages = mode === 'omron' ? [imageBase64] : [imageBase64, ...validExtras];
    const totalLength = allImages.reduce((sum, img) => sum + img.length, 0);
    if (totalLength > 12_000_000) {
      return new Response(
        JSON.stringify({ error: 'Tổng dung lượng ảnh vượt quá giới hạn cho phép' }),
        { status: 413, headers: CORS_HEADERS }
      );
    }

    // 3. Xây dựng chuỗi model ưu tiên (ưu tiên gemini-2.5-flash, kèm model tuỳ chọn nếu có)
    const envPrimaryModel = Deno.env.get('GEMINI_MODEL_PRIMARY');
    const customModels = [envPrimaryModel, preferredModel].filter(
      (m): m is string => typeof m === 'string' && m.trim().length > 0
    );
    const modelChain = Array.from(new Set([...DEFAULT_GEMINI_MODELS, ...customModels]));

    const systemPrompt = mode === 'omron' ? OMRON_SYSTEM_PROMPT : VISIT_SYSTEM_PROMPT;
    const userPrompt =
      mode === 'omron'
        ? 'Hãy đọc 3 số SYS, DIA, PULSE trên màn hình máy đo huyết áp này và trả về JSON.'
        : 'Hãy đọc chữ và số trên các ảnh giấy khám / đơn thuốc này và trả về đúng JSON đã yêu cầu.';

    let lastError = '';

    // 4. Gọi Gemini API chuẩn (generativelanguage.googleapis.com) bằng header x-goog-api-key (hỗ trợ cả key AQ. mới lẫn AIza cũ)
    for (const modelName of modelChain) {
      try {
        const res = await fetch(`${GEMINI_API_BASE_URL}/${modelName}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              {
                role: 'user',
                parts: [
                  ...allImages.map((data) => ({
                    inline_data: { mime_type: mimeType, data },
                  })),
                  { text: userPrompt },
                ],
              },
            ],
          }),
        });

        if (!res.ok) {
          let reason = '';
          try {
            const errBody = await res.json();
            reason = errBody?.error?.message
              ? `: ${String(errBody.error.message).slice(0, 160)}`
              : '';
          } catch {
            // Bỏ qua nếu không parse được JSON lỗi
          }
          lastError = `${modelName} HTTP ${res.status}${reason}`;
          continue;
        }

        const json = await res.json();
        const textPart = json?.candidates?.[0]?.content?.parts?.find((p: any) => p?.text);
        if (!textPart?.text) {
          lastError = `${modelName} không trả về nội dung text`;
          continue;
        }

        const cleanedJson = String(textPart.text)
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const parsed = JSON.parse(cleanedJson);

        return new Response(
          JSON.stringify({
            ...parsed,
            usedModel: modelName,
            fallbackUsed: modelName !== modelChain[0],
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      } catch (err: any) {
        lastError = err?.message || `Lỗi khi gọi model ${modelName}`;
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        error: 'Không gọi được Gemini API',
        detail: lastError,
      }),
      { status: 502, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Lỗi xử lý yêu cầu OCR', detail: err?.message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
