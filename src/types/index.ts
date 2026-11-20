// src/types/index.ts
// Định nghĩa kiểu dữ liệu dùng chung trong toàn bộ app

export type DoseStatus = 'taken' | 'skipped' | 'missed' | 'upcoming';

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage?: string | null;
  notes?: string | null;
  color?: string | null;
  stock?: number | null;
  low_stock_threshold?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  medication_id: string;
  time_of_day: string; // "08:00"
  days_of_week: number[]; // 1=Thứ 2 ... 7=CN
  dose_amount: number;
  enabled: boolean;
  created_at: string;
}

export interface DoseLog {
  id: string;
  user_id: string;
  medication_id: string;
  schedule_id?: string | null;
  scheduled_at: string; // ISO string
  taken_at?: string | null;
  status: 'taken' | 'skipped' | 'missed';
  created_at: string;
}

export type TimeOfDayGroup = 'morning' | 'noon' | 'afternoon' | 'evening';

export interface DoseTimelineItem {
  id: string; // duy nhất cho liều trong ngày (thường là scheduleId + dateStr)
  scheduleId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string; // "08:00"
  timeGroup: TimeOfDayGroup;
  status: DoseStatus;
  color?: string;
  doseLogId?: string;
  stock?: number;
  lowStockThreshold?: number;
  notes?: string;
}
