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
  image?: string | null; // Ảnh viên thuốc hoặc hộp thuốc
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
  image?: string | null;
  doseLogId?: string;
  stock?: number;
  totalCourseStock?: number;
  treatmentType?: TreatmentType;
  courseDurationMonths?: number;
  lowStockThreshold?: number;
  notes?: string;
}

export interface HistoryLogItem {
  id: string;
  doseId?: string;
  medicationName: string;
  dosage: string;
  takenTime: string;
  dateStr: string;
  status: 'taken' | 'skipped' | 'missed';
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

// Kiểu dữ liệu thuốc trong kho tra cứu (từ kho data-medicine)
export interface CatalogMedicine {
  name: string;
  brand?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  image?: string | null;
  original_image?: string | null;
  short_usage?: string | null;
  url?: string | null;
  classification?: string | null; // "Thuốc không kê đơn" | "Thuốc kê đơn"
  registration_number?: string | null;
  manufacturer?: string | null;
}

// Kiểu dữ liệu 1 loại thuốc trong đơn thuốc kê
export interface PrescriptionMedicineItem {
  id: string;
  name: string;
  image?: string | null;
  dosageForm?: string | null;
  quantity: number; // Số lượng viên/gói kê
  unit: string; // "viên", "gói", "tuýp", "chai"
  dosageInstruction: string; // "Ngày 2 lần, mỗi lần 1 viên sau ăn"
  timingNotes?: string; // Sáng: 1, Trưa: 0, Chiều: 0, Tối: 1
  durationDays?: number; // Liệu trình: 5 ngày, 7 ngày...
  notes?: string;
  classification?: string | null;
}

// Kiểu dữ liệu Toa / Đơn thuốc hoàn chỉnh
export interface Prescription {
  id: string;
  patientName: string; // Người bệnh (ví dụ: Bố, Mẹ, Bản thân...)
  condition: string; // Bệnh/triệu chứng: "Cảm cúm sốt, đau họng"
  doctorOrPharmacist: string; // "Dược sĩ Linh"
  createdAt: string;
  medicines: PrescriptionMedicineItem[];
  instructions?: string; // Dặn dò chung của dược sĩ
  status: 'active' | 'completed';
}

// Đơn thuốc của bạn (lưu ảnh độ phân giải cao sắc nét, tự điền thông tin bằng AI & lưu chỉ số Huyết áp / Đường huyết để so sánh)
export interface DoctorPrescription {
  id: string;
  title: string; // Loại bệnh / Tên đơn (ví dụ: "Đơn thuốc Huyết áp", "Đơn thuốc Tiểu đường")
  conditionType?: 'blood_pressure' | 'diabetes' | 'general'; // Phân loại để so sánh chỉ số
  medicationsText?: string; // Tên các thuốc trong đơn (AI đọc tự điền hoặc nhập tay)
  bloodPressureSystolic?: number | null; // Huyết áp tâm thu (ví dụ: 130 mmHg)
  bloodPressureDiastolic?: number | null; // Huyết áp tâm trương (ví dụ: 85 mmHg)
  bloodSugar?: number | null; // Chỉ số đường huyết (ví dụ: 6.4 mmol/L)
  startDate: string; // Ngày bắt đầu khởi tạo đơn thuốc (ví dụ: "21/11/2026")
  imageUri: string; // Ảnh chụp sắc nét độ phân giải gốc
  notes?: string; // Ghi chú tái khám (AI tự điền hoặc chỉnh sửa)
  createdAt: string;
}

// Cấu hình khung giờ nhắc mặc định & nhạc chuông
export interface ReminderSettings {
  morningTime: string; // "07:30"
  noonTime: string; // "12:00"
  afternoonTime: string; // "17:30"
  eveningTime: string; // "21:00"
  ringtoneId: 'default' | 'gentle' | 'loud_alarm' | 'vibrate_only';
  ringtoneName: string;
  highPriorityAlarm: boolean;
  hideDetailsOnLock: boolean;
}
