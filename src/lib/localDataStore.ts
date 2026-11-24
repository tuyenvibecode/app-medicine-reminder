// Mục đích: Lưu bền vững dữ liệu tủ thuốc, lịch uống và đồng bộ lên Supabase khi đã đăng nhập.
// src/lib/localDataStore.ts

import { LargeSecureStoreAdapter } from './secureStorage';
import { supabase } from './supabase';
import type {
  Medication,
  DoseTimelineItem,
  HistoryLogItem,
  DoctorPrescription,
  OmronReading,
  DoseStatus,
} from '@/types';

const KEY_APP_LOCAL_DATA = 'app_local_data_v1';

// Danh sách ID dữ liệu mẫu cũ từng được khởi tạo sẵn ở giai đoạn làm giao diện.
// Lọc bỏ tự động khi tải dữ liệu để thiết bị đã cài bản cũ cũng sạch dữ liệu ảo,
// nhưng vẫn giữ nguyên thuốc/lịch thật do người dùng tự thêm.
const LEGACY_MOCK_MEDICATION_IDS = new Set(['m-diabetes', 'm1', 'm2', 'm3', 'm4']);
const LEGACY_MOCK_DOSE_IDS = new Set(['1', '2', '3', '4', '5']);
const LEGACY_MOCK_LOG_IDS = new Set(['l1', 'l2', 'l3', 'l4']);

export interface PersistedAppData {
  medications: Medication[];
  doses: DoseTimelineItem[];
  historyLogs: HistoryLogItem[];
  doctorPrescriptions: DoctorPrescription[];
  omronReadings: OmronReading[];
  dateDoseStatusMap: Record<string, Record<string, DoseStatus>>;
}

/**
 * Loại bỏ các bản ghi mẫu cũ (nếu còn sót trong bộ nhớ máy) mà không đụng vào dữ liệu thật.
 */
export function stripLegacyMockData(
  data: Partial<PersistedAppData>
): Partial<PersistedAppData> {
  const cleaned: Partial<PersistedAppData> = { ...data };

  if (Array.isArray(data.medications)) {
    cleaned.medications = data.medications.filter(
      (m) => !LEGACY_MOCK_MEDICATION_IDS.has(m.id)
    );
  }

  if (Array.isArray(data.doses)) {
    cleaned.doses = data.doses.filter(
      (d) =>
        !LEGACY_MOCK_DOSE_IDS.has(d.id) &&
        !LEGACY_MOCK_MEDICATION_IDS.has(d.medicationId)
    );
  }

  if (Array.isArray(data.historyLogs)) {
    cleaned.historyLogs = data.historyLogs.filter(
      (l) =>
        !LEGACY_MOCK_LOG_IDS.has(l.id) &&
        (!l.doseId || !LEGACY_MOCK_DOSE_IDS.has(l.doseId))
    );
  }

  if (data.dateDoseStatusMap && typeof data.dateDoseStatusMap === 'object') {
    const nextMap: Record<string, Record<string, DoseStatus>> = {};
    for (const [dateKey, statusByDose] of Object.entries(data.dateDoseStatusMap)) {
      if (!statusByDose || typeof statusByDose !== 'object') continue;
      const filteredEntries = Object.entries(statusByDose).filter(
        ([doseId]) => !LEGACY_MOCK_DOSE_IDS.has(doseId)
      );
      if (filteredEntries.length > 0) {
        nextMap[dateKey] = Object.fromEntries(filteredEntries);
      }
    }
    cleaned.dateDoseStatusMap = nextMap;
  }

  return cleaned;
}

/**
 * Đọc toàn bộ dữ liệu ứng dụng đã lưu cục bộ trên máy (SecureStore có chia mảnh > 2KB)
 */
export async function loadAppLocalData(): Promise<Partial<PersistedAppData> | null> {
  try {
    const raw = await LargeSecureStoreAdapter.getItem(KEY_APP_LOCAL_DATA);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedAppData>;
    return stripLegacyMockData(parsed);
  } catch {
    return null;
  }
}

/**
 * Lưu toàn bộ dữ liệu ứng dụng xuống thiết bị để reload / mở lại app không bị mất
 */
export async function saveAppLocalData(data: PersistedAppData): Promise<void> {
  try {
    await LargeSecureStoreAdapter.setItem(KEY_APP_LOCAL_DATA, JSON.stringify(data));
  } catch {
    // Bỏ qua nếu bộ nhớ tạm thời bận
  }
}

/**
 * Đồng bộ thuốc và các khung giờ uống vừa thêm lên Supabase (khi người dùng đã đăng nhập).
 * Chạy ngầm, không chặn luồng offline-first trên máy.
 */
export async function syncNewMedicationToSupabase(
  med: Medication,
  clockTimes: string[]
): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const { data: insertedMed, error: medErr } = await supabase
      .from('medications')
      .insert({
        user_id: userId,
        name: med.name,
        dosage: med.dosage || null,
        notes: med.notes || null,
        treatment_type: med.treatment_type || 'ongoing',
        course_duration_months: med.course_duration_months ?? null,
        total_course_stock: med.total_course_stock ?? null,
        stock: med.stock ?? null,
        low_stock_threshold: med.low_stock_threshold ?? 5,
        is_active: true,
      })
      .select('id')
      .single();

    if (medErr || !insertedMed?.id) return;

    const scheduleRows = clockTimes.map((t) => ({
      user_id: userId,
      medication_id: insertedMed.id,
      time_of_day: t.length === 5 ? `${t}:00` : t,
      days_of_week: [1, 2, 3, 4, 5, 6, 7],
      dose_amount: 1,
      enabled: true,
    }));

    if (scheduleRows.length > 0) {
      await supabase.from('schedules').insert(scheduleRows);
    }
  } catch {
    // Chế độ offline: dữ liệu vẫn đã được lưu an toàn trên máy
  }
}
