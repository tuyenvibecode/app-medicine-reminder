// src/types/index.ts
// Định nghĩa kiểu dữ liệu dùng chung trong toàn bộ app

export type DoseStatus = 'taken' | 'skipped' | 'missed' | 'upcoming';
export type TreatmentType = 'ongoing' | 'course'; // 'ongoing' = Dài hạn/mãn tính, 'course' = Theo đợt/liệu trình
export type FamilyRole = 'patient' | 'pharmacist' | 'admin';

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage?: string | null;
  notes?: string | null;
  color?: string | null;
  treatment_type?: TreatmentType | null; // Dài hạn hoặc Theo đợt
  course_duration_months?: number | null; // Liệu trình kéo dài bao nhiêu tháng (ví dụ 3 tháng)
  total_course_stock?: number | null; // Tổng số viên cần cho cả liệu trình (ví dụ 90 viên)
  stock?: number | null; // Số lượng thực tế đã mua và hiện có trong tủ (ví dụ 30 viên)
  low_stock_threshold?: number | null; // Ngưỡng cảnh báo sắp hết trong đợt này (ví dụ 5 viên)
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
  id: string;
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
  totalCourseStock?: number;
  treatmentType?: TreatmentType;
  courseDurationMonths?: number;
  lowStockThreshold?: number;
  notes?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string; // "Bố", "Mẹ", "Vợ (Dược sĩ)", "Chủ hộ"
  role: FamilyRole;
  email: string;
  avatarColor?: string;
  joinedAt: string;
  isActive: boolean;
  inviteCode?: string;
}
