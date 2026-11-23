// Mục đích: Lưu bền vững dữ liệu tủ thuốc, lịch uống và đồng bộ lên Supabase khi đã đăng nhập.
// src/lib/localDataStore.ts

import { LargeSecureStoreAdapter } from './secureStorage';
import { supabase } from './supabase';
import type {
  Medication,
  DoseTimelineItem,
  HistoryLogItem,
  DoctorPrescription,
  DoseStatus,
} from '@/types';

const KEY_APP_LOCAL_DATA = 'app_local_data_v1';

export interface PersistedAppData {
  medications: Medication[];
  doses: DoseTimelineItem[];
  historyLogs: HistoryLogItem[];
  doctorPrescriptions: DoctorPrescription[];
  dateDoseStatusMap: Record<string, Record<string, DoseStatus>>;
}

/**
 * Đọc toàn bộ dữ liệu ứng dụng đã lưu cục bộ trên máy (SecureStore có chia mảnh > 2KB)
 */
export async function loadAppLocalData(): Promise<Partial<PersistedAppData> | null> {
  try {
    const raw = await LargeSecureStoreAdapter.getItem(KEY_APP_LOCAL_DATA);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistedAppData>;
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
