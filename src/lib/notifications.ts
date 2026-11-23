// Mục đích: Quản lý thông báo local nhắc uống thuốc và 4 kênh nhạc chuông Android qua expo-notifications.
// src/lib/notifications.ts
// Quản lý thông báo local nhắc uống thuốc bằng expo-notifications
// Hỗ trợ 4 kênh thông báo Android riêng biệt tương ứng 4 kiểu Nhạc chuông / Rung (vì Android 8+ khoá âm thanh theo từng channel)

import {
  setNotificationHandler,
  setNotificationChannelAsync,
  setNotificationCategoryAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  AndroidImportance,
  AndroidNotificationVisibility,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';
import { Platform, Vibration } from 'react-native';
import type { DoseTimelineItem, ReminderSettings } from '@/types';

export type RingtoneId = ReminderSettings['ringtoneId'];

export const CHANNEL_IDS: Record<RingtoneId, string> = {
  default: 'medication-reminders-default-v3',
  gentle: 'medication-reminders-gentle-v3',
  loud_alarm: 'medication-reminders-loud-v3',
  vibrate_only: 'medication-reminders-vibrate-v3',
};

export const ACTION_TAKEN = 'ACTION_TAKEN';
export const ACTION_SNOOZE = 'ACTION_SNOOZE';
export const CATEGORY_MEDICATION_REMINDER = 'CATEGORY_MEDICATION_REMINDER';

export function getChannelIdForRingtone(ringtoneId: RingtoneId = 'default'): string {
  return CHANNEL_IDS[ringtoneId] || CHANNEL_IDS.default;
}

/**
 * Trả về tên file nhạc chuông thật tương ứng với từng kiểu âm báo
 * (Các file WAV được đóng gói trong assets/sounds và đăng ký trong app.json)
 */
export function getSoundForRingtone(ringtoneId: RingtoneId = 'default'): string | false {
  switch (ringtoneId) {
    case 'gentle':
      return 'reminder_gentle.wav';
    case 'loud_alarm':
      return 'reminder_loud.wav';
    case 'vibrate_only':
      return false;
    default:
      return 'reminder_standard.wav';
  }
}

// Cấu hình cách thông báo hiển thị khi app đang mở
try {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch { }

/**
 * Khởi tạo cả 4 kênh thông báo Android (Tiêu chuẩn / Nhẹ nhàng / Báo thức lớn / Chỉ rung)
 * và danh mục hành động nhanh (Đã uống / Nhắc lại sau 15 phút).
 */
export async function setupNotificationChannels(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // 1. Chuông báo tiêu chuẩn
      await setNotificationChannelAsync(CHANNEL_IDS.default, {
        name: 'Nhắc thuốc - Tiêu chuẩn',
        description: 'Âm thanh chuông tiêu chuẩn kết hợp rung 2 nhịp rõ ràng',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#0D9488',
        sound: 'reminder_standard.wav',
        enableVibrate: true,
        enableLights: true,
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      // 2. Âm báo nhẹ nhàng
      await setNotificationChannelAsync(CHANNEL_IDS.gentle, {
        name: 'Nhắc thuốc - Nhẹ nhàng',
        description: 'Âm báo dịu tai kèm rung nhẹ 1 nhịp',
        importance: AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150],
        lightColor: '#0D9488',
        sound: 'reminder_gentle.wav',
        enableVibrate: true,
        enableLights: true,
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      });

      // 3. Chuông báo thức lớn (cho ông bà)
      await setNotificationChannelAsync(CHANNEL_IDS.loud_alarm, {
        name: 'Nhắc thuốc - Báo thức lớn',
        description: 'Ưu tiên mức tối đa (MAX) và rung liên tục 3 nhịp dài',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#0D9488',
        sound: 'reminder_loud.wav',
        enableVibrate: true,
        enableLights: true,
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      // 4. Chỉ rung (im lặng)
      await setNotificationChannelAsync(CHANNEL_IDS.vibrate_only, {
        name: 'Nhắc thuốc - Chỉ rung',
        description: 'Chỉ rung thiết bị, không phát tiếng chuông',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#0D9488',
        sound: null,
        enableVibrate: true,
        enableLights: true,
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      });
    }

    await setNotificationCategoryAsync(CATEGORY_MEDICATION_REMINDER, [
      {
        identifier: ACTION_TAKEN,
        buttonTitle: '✓ Đã uống',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: ACTION_SNOOZE,
        buttonTitle: '⏱ Nhắc lại sau 15 phút',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  } catch {
    // Bỏ qua lỗi trên Expo Go nếu API bị hạn chế
  }
}

/**
 * Yêu cầu quyền thông báo từ người dùng
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Phát thử ngay thông báo nhắc thuốc thật theo đúng kênh Nhạc chuông / Rung đã chọn
 */
export async function sendTestReminderNotification(
  ringtoneId: RingtoneId,
  ringtoneName: string
): Promise<boolean> {
  try {
    // Rung phản hồi ngay lập tức theo đúng kiểu đã chọn
    if (Platform.OS !== 'web') {
      if (ringtoneId === 'loud_alarm') {
        Vibration.vibrate([0, 400, 150, 400, 150, 400]);
      } else if (ringtoneId === 'gentle') {
        Vibration.vibrate(150);
      } else {
        Vibration.vibrate([0, 250, 150, 250]);
      }
    }

    await setupNotificationChannels();
    const granted = await requestNotificationPermissions();
    if (!granted) return false;

    const channelId = getChannelIdForRingtone(ringtoneId);

    await scheduleNotificationAsync({
      content: {
        title: '🔔 Thử chuông nhắc uống thuốc',
        body: `Đang áp dụng: ${ringtoneName}. Đã đến giờ uống thuốc của bạn!`,
        categoryIdentifier: CATEGORY_MEDICATION_REMINDER,
        sound: getSoundForRingtone(ringtoneId),
        data: {
          type: 'MEDICATION_REMINDER',
          medicationName: 'Thử chuông nhắc thuốc',
          dosage: ringtoneName,
          scheduledTime: 'Bây giờ',
        },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: Platform.OS === 'android' ? channelId : undefined,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Đặt lịch thông báo nhắc lại sau 15 phút (Snooze)
 */
export async function scheduleSnoozeNotification(
  medicationName: string,
  dosage: string,
  hideDetails = false,
  ringtoneId: RingtoneId = 'default',
  doseId?: string,
  scheduledTime?: string,
  imageUrl?: string | null
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    const channelId = getChannelIdForRingtone(ringtoneId);

    return await scheduleNotificationAsync({
      content: {
        title: hideDetails ? 'Đến giờ uống thuốc' : `Đến giờ uống thuốc: ${medicationName}`,
        body: hideDetails ? 'Mở ứng dụng để xem chi tiết liều thuốc của bạn' : `Liều lượng: ${dosage}`,
        categoryIdentifier: CATEGORY_MEDICATION_REMINDER,
        sound: getSoundForRingtone(ringtoneId),
        data: {
          type: 'MEDICATION_REMINDER',
          doseId: doseId || '',
          medicationName,
          dosage,
          scheduledTime: scheduledTime || '',
          imageUrl: imageUrl || '',
        },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 15 * 60,
        channelId: Platform.OS === 'android' ? channelId : undefined,
      },
    });
  } catch {
    return null;
  }
}

/**
 * Tính danh sách thời điểm báo thức chính xác tới từng giây (:00) cho N ngày kế tiếp.
 * Dùng trigger dạng DATE thay cho DAILY trên Android vì AlarmManager.setRepeating (DAILY)
 * bị Android gom lịch nên hay báo sớm 1 phút hoặc trễ 2-5 phút.
 */
export function getNextExactReminderDates(
  hour: number,
  minute: number,
  daysCount = 7,
  now = new Date(),
  skipToday = false
): Date[] {
  const first = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );

  // Nếu giờ này hôm nay đã qua hoặc liều hôm nay đã uống -> bắt đầu từ ngày mai
  if (skipToday || first.getTime() <= now.getTime()) {
    first.setDate(first.getDate() + 1);
  }

  const dates: Date[] = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(first.getTime());
    d.setDate(first.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Đặt lịch nhắc uống thuốc chính xác từng giây (dùng DATE trigger cho 7 ngày kế tiếp)
 * theo giờ:phút và đúng kênh nhạc chuông.
 */
export async function scheduleDailyReminder(
  medicationName: string,
  dosage: string,
  hour: number,
  minute: number,
  hideDetails = false,
  ringtoneId: RingtoneId = 'default',
  doseId?: string,
  imageUrl?: string | null,
  skipToday = false
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    const channelId = getChannelIdForRingtone(ringtoneId);
    const scheduledTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const exactDates = getNextExactReminderDates(hour, minute, 7, new Date(), skipToday);

    let firstId: string | null = null;
    for (const targetDate of exactDates) {
      const id = await scheduleNotificationAsync({
        content: {
          title: hideDetails ? 'Đến giờ uống thuốc' : `Nhắc uống thuốc: ${medicationName}`,
          body: hideDetails
            ? 'Mở ứng dụng để xem chi tiết liều thuốc của bạn'
            : dosage || 'Đã đến giờ uống thuốc của bạn',
          categoryIdentifier: CATEGORY_MEDICATION_REMINDER,
          sound: getSoundForRingtone(ringtoneId),
          data: {
            type: 'MEDICATION_REMINDER',
            doseId: doseId || '',
            medicationName,
            dosage: dosage || '',
            scheduledTime,
            imageUrl: imageUrl || '',
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: targetDate,
          channelId: Platform.OS === 'android' ? channelId : undefined,
        },
      });
      if (!firstId) firstId = id;
    }

    return firstId;
  } catch {
    return null;
  }
}

/**
 * Huỷ các báo thức cũ và đặt lại toàn bộ lịch nhắc hàng ngày theo giờ & nhạc chuông mới
 */
export async function rescheduleAllDailyReminders(
  doses: DoseTimelineItem[],
  ringtoneId: RingtoneId,
  hideDetails: boolean,
  takenTodayIds?: Set<string>
): Promise<void> {
  try {
    await setupNotificationChannels();
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    await cancelAllScheduledNotificationsAsync();

    for (const dose of doses) {
      const [hStr, mStr] = dose.scheduledTime.split(':');
      const hour = parseInt(hStr || '8', 10);
      const minute = parseInt(mStr || '0', 10);
      if (isNaN(hour) || isNaN(minute)) continue;

      const skipToday = Boolean(takenTodayIds?.has(dose.id) || dose.status === 'taken');

      await scheduleDailyReminder(
        dose.medicationName,
        dose.dosage,
        hour,
        minute,
        hideDetails,
        ringtoneId,
        dose.id,
        dose.image,
        skipToday
      );
    }
  } catch {
    // Bỏ qua nếu đang chạy trên web hoặc môi trường không hỗ trợ
  }
}
