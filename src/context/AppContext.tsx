// src/context/AppContext.tsx
// Quản lý trạng thái trung tâm của ứng dụng: Tủ thuốc, Lịch nhắc hôm nay, Lịch sử uống,
// Đơn thuốc bác sĩ kê (ảnh sắc nét) và Cấu hình giờ nhắc & Nhạc chuông.

import React, { createContext, useContext, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { scheduleDailyReminder, scheduleSnoozeNotification } from '@/lib/notifications';
import type {
  Medication,
  DoseTimelineItem,
  HistoryLogItem,
  PrescriptionMedicineItem,
  TimeOfDayGroup,
  TreatmentType,
  DoctorPrescription,
  ReminderSettings,
} from '@/types';

const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'm-diabetes',
    user_id: 'u1',
    name: 'Glucophage XR 500mg (Tiểu đường)',
    dosage: '1 viên / ngày - Sau bữa tối',
    notes: 'Liệu trình điều trị 3 tháng liên tiếp',
    treatment_type: 'course',
    course_duration_months: 3,
    total_course_stock: 90,
    stock: 30,
    low_stock_threshold: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'm1',
    user_id: 'u1',
    name: 'Amlodipine 5mg (Huyết áp)',
    dosage: '1 viên / ngày',
    notes: 'Uống sau bữa ăn sáng',
    treatment_type: 'ongoing',
    stock: 24,
    low_stock_threshold: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'm2',
    user_id: 'u1',
    name: 'Omega 3 Dầu cá Nauy',
    dosage: '1 viên nang mềm / ngày',
    notes: 'Bảo quản nơi thoáng mát',
    treatment_type: 'ongoing',
    stock: 12,
    low_stock_threshold: 7,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'm3',
    user_id: 'u1',
    name: 'Vitamin C 500mg',
    dosage: '1 viên / ngày',
    notes: 'Uống sau bữa trưa',
    treatment_type: 'ongoing',
    stock: 4,
    low_stock_threshold: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'm4',
    user_id: 'u1',
    name: 'Magnesium B6',
    dosage: '1 viên / ngày',
    notes: 'Uống trước khi ngủ 30 phút',
    treatment_type: 'ongoing',
    stock: 30,
    low_stock_threshold: 6,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_DOSES: DoseTimelineItem[] = [
  {
    id: '1',
    scheduleId: 's1',
    medicationId: 'm1',
    medicationName: 'Amlodipine 5mg (Huyết áp)',
    dosage: '1 viên (5mg) - Sau ăn',
    scheduledTime: '07:30',
    timeGroup: 'morning',
    status: 'taken',
    stock: 24,
    lowStockThreshold: 5,
  },
  {
    id: '2',
    scheduleId: 's2',
    medicationId: 'm2',
    medicationName: 'Omega 3 Dầu cá Nauy',
    dosage: '1 viên nang mềm - Sau ăn',
    scheduledTime: '08:00',
    timeGroup: 'morning',
    status: 'upcoming',
    stock: 12,
    lowStockThreshold: 7,
  },
  {
    id: '3',
    scheduleId: 's3',
    medicationId: 'm3',
    medicationName: 'Vitamin C 500mg',
    dosage: '1 viên - Sau bữa trưa',
    scheduledTime: '12:30',
    timeGroup: 'noon',
    status: 'upcoming',
    stock: 4,
    lowStockThreshold: 5,
  },
  {
    id: '5',
    scheduleId: 's5',
    medicationId: 'm-diabetes',
    medicationName: 'Glucophage XR 500mg (Tiểu đường)',
    dosage: '1 viên - Sau bữa tối',
    scheduledTime: '19:30',
    timeGroup: 'evening',
    status: 'upcoming',
    stock: 30,
    totalCourseStock: 90,
    courseDurationMonths: 3,
    treatmentType: 'course',
    lowStockThreshold: 5,
  },
  {
    id: '4',
    scheduleId: 's4',
    medicationId: 'm4',
    medicationName: 'Magnesium B6',
    dosage: '1 viên - Trước khi ngủ 30 phút',
    scheduledTime: '21:00',
    timeGroup: 'evening',
    status: 'upcoming',
    stock: 30,
    lowStockThreshold: 6,
  },
];

const INITIAL_HISTORY_LOGS: HistoryLogItem[] = [
  {
    id: 'l1',
    doseId: '1',
    medicationName: 'Amlodipine 5mg (Huyết áp)',
    dosage: '1 viên (5mg) - Sau ăn',
    takenTime: '07:35',
    dateStr: 'Hôm nay',
    status: 'taken',
  },
  {
    id: 'l2',
    medicationName: 'Magnesium B6',
    dosage: '1 viên',
    takenTime: '21:10',
    dateStr: 'Hôm qua',
    status: 'taken',
  },
  {
    id: 'l3',
    medicationName: 'Vitamin C 500mg',
    dosage: '1 viên',
    takenTime: '12:45',
    dateStr: 'Hôm qua',
    status: 'taken',
  },
  {
    id: 'l4',
    medicationName: 'Amlodipine 5mg (Huyết áp)',
    dosage: '1 viên 5mg',
    takenTime: '07:40',
    dateStr: 'Hôm qua',
    status: 'taken',
  },
];

const INITIAL_REMINDER_SETTINGS: ReminderSettings = {
  morningTime: '07:30',
  noonTime: '12:00',
  afternoonTime: '18:00',
  eveningTime: '21:00',
  ringtoneId: 'default',
  ringtoneName: 'Chuông báo tiêu chuẩn (Rõ ràng)',
  highPriorityAlarm: true,
  hideDetailsOnLock: false,
};

export interface AddMedicationInput {
  name: string;
  dosage: string;
  notes?: string;
  image?: string | null;
  treatmentType: TreatmentType;
  courseDurationMonths?: number;
  totalCourseStock?: number;
  stock: number;
  lowStockThreshold: number;
  selectedTimes: string[]; // Ví dụ: ['07:30 (Sáng)', '15:30', '21:00 (Tối)']
}

interface AppContextValue {
  medications: Medication[];
  doses: DoseTimelineItem[];
  historyLogs: HistoryLogItem[];
  doctorPrescriptions: DoctorPrescription[];
  reminderSettings: ReminderSettings;
  takeDose: (item: DoseTimelineItem) => void;
  undoTakeDose: (item: DoseTimelineItem) => void;
  snoozeDose: (item: DoseTimelineItem) => void;
  refillMedication: (medicationId: string, addCount: number) => void;
  addMedication: (input: AddMedicationInput) => void;
  syncPrescriptionToReminders: (items: PrescriptionMedicineItem[]) => void;
  addDoctorPrescription: (item: Omit<DoctorPrescription, 'id' | 'createdAt'>) => void;
  deleteDoctorPrescription: (id: string) => void;
  updateReminderSettings: (patch: Partial<ReminderSettings>) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * Xác định nhóm buổi trong ngày dựa vào chuỗi giờ "HH:mm"
 */
export function getTimeGroupFromTime(timeStr: string): TimeOfDayGroup {
  const hour = parseInt(timeStr.split(':')[0] || '8', 10);
  if (hour < 11) return 'morning';
  if (hour < 14) return 'noon';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [doses, setDoses] = useState<DoseTimelineItem[]>(INITIAL_DOSES);
  const [historyLogs, setHistoryLogs] = useState<HistoryLogItem[]>(INITIAL_HISTORY_LOGS);
  const [doctorPrescriptions, setDoctorPrescriptions] = useState<DoctorPrescription[]>([]);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(
    INITIAL_REMINDER_SETTINGS
  );

  // Đánh dấu đã uống thuốc: trừ tồn kho 1 viên và ghi nhận vào lịch sử
  const takeDose = useCallback((item: DoseTimelineItem) => {
    if (item.status === 'taken') return;

    const currentTimeStr = format(new Date(), 'HH:mm');

    setDoses((prev) =>
      prev.map((d) => {
        if (d.id === item.id) {
          const nextStock = d.stock !== undefined ? Math.max(0, d.stock - 1) : undefined;
          return { ...d, status: 'taken', stock: nextStock };
        }
        if (d.medicationId === item.medicationId && d.stock !== undefined) {
          return { ...d, stock: Math.max(0, d.stock - 1) };
        }
        return d;
      })
    );

    setMedications((prev) =>
      prev.map((m) => {
        if (m.id === item.medicationId) {
          const currentStock = m.stock ?? 0;
          return {
            ...m,
            stock: Math.max(0, currentStock - 1),
            updated_at: new Date().toISOString(),
          };
        }
        return m;
      })
    );

    setHistoryLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        doseId: item.id,
        medicationName: item.medicationName,
        dosage: item.dosage,
        takenTime: currentTimeStr,
        dateStr: 'Hôm nay',
        status: 'taken',
      },
      ...prev,
    ]);
  }, []);

  // Hoàn tác trạng thái đã uống: cộng lại tồn kho 1 viên và xoá nhật ký vừa ghi
  const undoTakeDose = useCallback((item: DoseTimelineItem) => {
    if (item.status !== 'taken') return;

    setDoses((prev) =>
      prev.map((d) => {
        if (d.id === item.id) {
          const nextStock = d.stock !== undefined ? d.stock + 1 : undefined;
          return { ...d, status: 'upcoming', stock: nextStock };
        }
        if (d.medicationId === item.medicationId && d.stock !== undefined) {
          return { ...d, stock: d.stock + 1 };
        }
        return d;
      })
    );

    setMedications((prev) =>
      prev.map((m) => {
        if (m.id === item.medicationId) {
          const currentStock = m.stock ?? 0;
          return {
            ...m,
            stock: currentStock + 1,
            updated_at: new Date().toISOString(),
          };
        }
        return m;
      })
    );

    setHistoryLogs((prev) => {
      const idx = prev.findIndex((l) => l.doseId === item.id && l.dateStr === 'Hôm nay');
      if (idx === -1) return prev;
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });
  }, []);

  // Hẹn nhắc lại sau 15 phút qua thông báo hệ thống
  const snoozeDose = useCallback((item: DoseTimelineItem) => {
    scheduleSnoozeNotification(item.medicationName, item.dosage).catch(() => {});
  }, []);

  // Nạp thêm số lượng viên vào tủ thuốc và đồng bộ với lịch hôm nay
  const refillMedication = useCallback((medicationId: string, addCount: number) => {
    setMedications((prev) =>
      prev.map((m) => {
        if (m.id === medicationId) {
          const newStock = (m.stock || 0) + addCount;
          return { ...m, stock: newStock, updated_at: new Date().toISOString() };
        }
        return m;
      })
    );

    setDoses((prev) =>
      prev.map((d) => {
        if (d.medicationId === medicationId) {
          return { ...d, stock: (d.stock || 0) + addCount };
        }
        return d;
      })
    );
  }, []);

  // Thêm thuốc mới vào tủ thuốc và tự động tạo lịch nhắc trong ngày
  const addMedication = useCallback((input: AddMedicationInput) => {
    const medId = `med-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const cleanDosage = input.dosage.trim() || '1 viên - Sau ăn';

    const newMed: Medication = {
      id: medId,
      user_id: 'u1',
      name: input.name.trim(),
      dosage: cleanDosage,
      notes: input.notes?.trim() || null,
      image: input.image || null,
      treatment_type: input.treatmentType,
      course_duration_months: input.treatmentType === 'course' ? input.courseDurationMonths : null,
      total_course_stock: input.treatmentType === 'course' ? input.totalCourseStock : null,
      stock: input.stock,
      low_stock_threshold: input.lowStockThreshold,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    };

    setMedications((prev) => [newMed, ...prev]);

    const timesToSchedule = input.selectedTimes.length > 0 ? input.selectedTimes : ['07:30'];
    const newDoses: DoseTimelineItem[] = timesToSchedule.map((rawTime, idx) => {
      // Tách phần "07:30" từ "07:30 (Sáng)"
      const clockTime = rawTime.split(' ')[0] || '07:30';
      const [hStr, mStr] = clockTime.split(':');
      const hour = parseInt(hStr || '7', 10);
      const minute = parseInt(mStr || '30', 10);

      scheduleDailyReminder(newMed.name, cleanDosage, hour, minute).catch(() => {});

      return {
        id: `dose-${Date.now()}-${idx}`,
        scheduleId: `sched-${Date.now()}-${idx}`,
        medicationId: medId,
        medicationName: newMed.name,
        dosage: cleanDosage,
        scheduledTime: clockTime,
        timeGroup: getTimeGroupFromTime(clockTime),
        status: 'upcoming',
        image: newMed.image,
        stock: input.stock,
        totalCourseStock: input.treatmentType === 'course' ? input.totalCourseStock : undefined,
        courseDurationMonths: input.treatmentType === 'course' ? input.courseDurationMonths : undefined,
        treatmentType: input.treatmentType,
        lowStockThreshold: input.lowStockThreshold,
        notes: newMed.notes || undefined,
      };
    });

    setDoses((prev) => [...prev, ...newDoses]);
  }, []);

  // Đồng bộ toàn bộ thuốc từ Phiếu đơn thuốc vào Tủ thuốc và Lịch nhắc hôm nay
  const syncPrescriptionToReminders = useCallback(
    (items: PrescriptionMedicineItem[]) => {
      if (items.length === 0) return;

      const nowIso = new Date().toISOString();
      const addedMeds: Medication[] = [];
      const addedDoses: DoseTimelineItem[] = [];

      items.forEach((item, index) => {
        const medId = `rx-med-${Date.now()}-${index}`;
        const med: Medication = {
          id: medId,
          user_id: 'u1',
          name: item.name,
          dosage: item.dosageInstruction,
          notes: item.notes || `Đơn thuốc gia đình (${item.durationDays || 5} ngày)`,
          image: item.image || null,
          treatment_type: 'course',
          course_duration_months: 1,
          total_course_stock: item.quantity,
          stock: item.quantity,
          low_stock_threshold: Math.min(3, Math.max(1, Math.floor(item.quantity * 0.2))),
          is_active: true,
          created_at: nowIso,
          updated_at: nowIso,
        };
        addedMeds.push(med);

        // Phân tích khung giờ tự động từ hướng dẫn liều dùng theo cấu hình giờ gia đình
        const instrLower = item.dosageInstruction.toLowerCase();
        let times: string[] = [reminderSettings.morningTime];
        if (instrLower.includes('3 lần')) {
          times = [
            reminderSettings.morningTime,
            reminderSettings.noonTime,
            reminderSettings.eveningTime,
          ];
        } else if (instrLower.includes('2 lần')) {
          times = [reminderSettings.morningTime, reminderSettings.eveningTime];
        } else if (instrLower.includes('trước khi ngủ') || instrLower.includes('tối')) {
          times = [reminderSettings.eveningTime];
        } else if (instrLower.includes('trưa')) {
          times = [reminderSettings.noonTime];
        } else if (instrLower.includes('chiều')) {
          times = [reminderSettings.afternoonTime];
        }

        times.forEach((clockTime, tIdx) => {
          const [hStr, mStr] = clockTime.split(':');
          scheduleDailyReminder(
            item.name,
            item.dosageInstruction,
            parseInt(hStr || '8', 10),
            parseInt(mStr || '0', 10)
          ).catch(() => {});

          addedDoses.push({
            id: `rx-dose-${Date.now()}-${index}-${tIdx}`,
            scheduleId: `rx-sched-${Date.now()}-${index}-${tIdx}`,
            medicationId: medId,
            medicationName: item.name,
            dosage: item.dosageInstruction,
            scheduledTime: clockTime,
            timeGroup: getTimeGroupFromTime(clockTime),
            status: 'upcoming',
            image: item.image || null,
            stock: item.quantity,
            totalCourseStock: item.quantity,
            treatmentType: 'course',
            lowStockThreshold: med.low_stock_threshold ?? 3,
          });
        });
      });

      setMedications((prev) => [...addedMeds, ...prev]);
      setDoses((prev) => [...prev, ...addedDoses]);
    },
    [reminderSettings]
  );

  // Thêm đơn thuốc giấy của bác sĩ (lưu ảnh độ phân giải cao sắc nét)
  const addDoctorPrescription = useCallback(
    (item: Omit<DoctorPrescription, 'id' | 'createdAt'>) => {
      const newDoc: DoctorPrescription = {
        ...item,
        id: `doc-rx-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setDoctorPrescriptions((prev) => [newDoc, ...prev]);
    },
    []
  );

  const deleteDoctorPrescription = useCallback((id: string) => {
    setDoctorPrescriptions((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateReminderSettings = useCallback((patch: Partial<ReminderSettings>) => {
    setReminderSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        medications,
        doses,
        historyLogs,
        doctorPrescriptions,
        reminderSettings,
        takeDose,
        undoTakeDose,
        snoozeDose,
        refillMedication,
        addMedication,
        syncPrescriptionToReminders,
        addDoctorPrescription,
        deleteDoctorPrescription,
        updateReminderSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore phải được sử dụng bên trong AppProvider');
  }
  return context;
}
