// supabase/functions/ocr-prescription/index.ts
// Supabase Edge Function đọc chữ từ ảnh đơn thuốc (OCR) bằng Gemini Interactions API (v1)
// Tuân thủ rule 01-security.md & 04-medical-safety.md:
// 1. Khoá GEMINI_API_KEY chỉ nằm trong Supabase Secrets trên server, tuyệt đối không nằm trong APK.
// 2. Có chuỗi Model Dự Phòng Tự Động (Auto-Fallback Chain): nếu model chính bị đổi tên/quá tải,
//    tự động chuyển sang các model dự phòng tiếp theo mà không làm gián đoạn ứng dụng.
// 3. Không ghi log nội dung ảnh y tế nhạy cảm của người dùng.

const INTERACTIONS_API_URL = 'https://generativelanguage.googleapis.com/v1/interactions';

// Chuỗi model dự phòng theo thứ tự ưu tiên (Interactions API v1)
const DEFAULT_MODEL_FALLBACK_CHAIN = [
  'gemini-4-hydrogen',
  'gemini-3.5-flash-lite',
  'gemini-4-argon',
  'gemini-3.1-flash-lite',
];

const SYSTEM_PROMPT = `Bạn là trợ lý đọc chữ (OCR) trên ảnh đơn thuốc tiếng Việt.
Chỉ đọc chữ thực tế có trên ảnh và trích xuất thành JSON thuần (không dùng markdown code block, không tự bịa lời khuyên y tế) theo đúng cấu trúc:
{
  "title": "Tên loại bệnh hoặc tên đơn thuốc (ví dụ: Đơn thuốc Huyết áp & Tim mạch)",
  "conditionType": "blood_pressure" | "diabetes" | "general",
  "medicationsText": "Danh sách các thuốc và liều dùng đọc được từ ảnh (ví dụ: Amlodipine 5mg - Sáng 1 viên, Losartan 50mg - Tối 1 viên)",
  "systolic": 130,
  "diastolic": 85,
  "bloodSugar": null,
  "notes": "Ghi chú ngày tái khám hoặc lời dặn ghi trên đơn"
}`;

declare const Deno: any;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Kiểm tra header Authorization (JWT của người dùng đã đăng nhập)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Thiếu thông tin xác thực JWT' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Chưa cấu hình GEMINI_API_KEY trong Supabase Secrets' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { imageBase64, mimeType = 'image/jpeg', preferredModel } = body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'Thiếu dữ liệu ảnh cần đọc' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Giới hạn kích thước ảnh (~6MB base64) để chống lạm dụng
    if (imageBase64.length > 8_000_000) {
      return new Response(JSON.stringify({ error: 'Kích thước ảnh vượt quá giới hạn cho phép' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Xây dựng chuỗi model ưu tiên:
    // 1. Model truyền từ cấu hình người dùng hoặc biến môi trường GEMINI_MODEL_PRIMARY
    // 2. Các model trong chuỗi dự phòng mặc định
    const envPrimaryModel = Deno.env.get('GEMINI_MODEL_PRIMARY');
    const customModels = [preferredModel, envPrimaryModel].filter(
      (m): m is string => typeof m === 'string' && m.trim().length > 0
    );
    const modelChain = Array.from(new Set([...customModels, ...DEFAULT_MODEL_FALLBACK_CHAIN]));

    let lastError = '';

    // Thử lần lượt từng model trong chuỗi dự phòng (Auto-Fallback)
    for (const modelName of modelChain) {
      try {
        const response = await fetch(INTERACTIONS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
            'Api-Revision': '2026-05-20',
          },
          body: JSON.stringify({
            model: modelName,
            store: false, // Không lưu ảnh y tế của người dùng trên server AI
            system_instruction: SYSTEM_PROMPT,
            input: [
              {
                type: 'image',
                data: imageBase64,
                mime_type: mimeType,
              },
              {
                type: 'text',
                text: 'Hãy đọc chữ trên ảnh đơn thuốc này và trả về đúng định dạng JSON đã yêu cầu.',
              },
            ],
          }),
        });

        if (!response.ok) {
          lastError = `Model ${modelName} trả về HTTP ${response.status}`;
          continue; // Tự động chuyển sang model dự phòng tiếp theo
        }

        const interaction = await response.json();

        // Trích xuất text từ model_output step trong interaction.steps
        let outputText = interaction?.output_text || '';
        if (!outputText && Array.isArray(interaction?.steps)) {
          for (let i = interaction.steps.length - 1; i >= 0; i--) {
            const step = interaction.steps[i];
            if (step?.type === 'model_output' && Array.isArray(step?.content)) {
              const textPart = step.content.find((c: any) => c?.type === 'text' && c?.text);
              if (textPart) {
                outputText = textPart.text;
                break;
              }
            }
          }
        }

        if (!outputText) {
          lastError = `Model ${modelName} không trả về nội dung text`;
          continue;
        }

        const cleanedJson = outputText
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
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch (err: any) {
        lastError = err?.message || `Lỗi khi gọi model ${modelName}`;
        continue; // Chuyển sang model dự phòng tiếp theo
      }
    }

    return new Response(
      JSON.stringify({
        error: 'Tất cả các model trong chuỗi dự phòng đều không phản hồi',
        detail: lastError,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Lỗi xử lý yêu cầu OCR', detail: err?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
