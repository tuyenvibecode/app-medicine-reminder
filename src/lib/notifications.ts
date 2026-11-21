// src/lib/notifications.ts
// Quản lý thông báo local nhắc uống thuốc bằng expo-notifications
// Tuân thủ skill medication-reminders: chạy local độc lập mạng

import {
  setNotificationHandler,
  setNotificationChannelAsync,
  setNotificationCategoryAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  AndroidImportance,
  AndroidNotificationVisibility,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';
import { Platform } from 'react-native';

export const MEDICATION_CHANNEL_ID = 'medication-reminders-high';
export const ACTION_TAKEN = 'ACTION_TAKEN';
export const ACTION_SNOOZE = 'ACTION_SNOOZE';
export const CATEGORY_MEDICATION_REMINDER = 'CATEGORY_MEDICATION_REMINDER';

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
} catch {}

/**
 * Khởi tạo kênh thông báo ưu tiên cao (Android) và danh mục hành động (Đã uống / Nhắc lại)
 * Bọc try-catch để chạy an toàn trên cả Expo Go lẫn bản APK độc lập.
 */
export async function setupNotificationChannels(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await setNotificationChannelAsync(MEDICATION_CHANNEL_ID, {
        name: 'Nhắc uống thuốc',
        description: 'Thông báo báo thức nhắc uống thuốc đúng giờ',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0D9488',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
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
    // Bỏ qua lỗi trên Expo Go (do Expo Go bị hạn chế với một số API notifications)
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
 * Đặt lịch thông báo nhắc lại sau 15 phút (Snooze)
 * Hỗ trợ ẩn tên thuốc trên màn hình khoá khi người dùng bật chế độ riêng tư.
 */
export async function scheduleSnoozeNotification(
  medicationName: string,
  dosage: string,
  hideDetails = false
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    return await scheduleNotificationAsync({
      content: {
        title: hideDetails ? 'Đến giờ uống thuốc' : `Đến giờ uống thuốc: ${medicationName}`,
        body: hideDetails ? 'Mở ứng dụng để xem chi tiết liều thuốc của bạn' : `Liều lượng: ${dosage}`,
        categoryIdentifier: CATEGORY_MEDICATION_REMINDER,
        sound: 'default',
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 15 * 60,
        channelId: Platform.OS === 'android' ? MEDICATION_CHANNEL_ID : undefined,
      },
    });
  } catch {
    return null;
  }
}

/**
 * Đặt lịch nhắc uống thuốc hàng ngày theo giờ:phút
 * Hỗ trợ ẩn tên thuốc trên màn hình khoá khi bật chế độ riêng tư.
 */
export async function scheduleDailyReminder(
  medicationName: string,
  dosage: string,
  hour: number,
  minute: number,
  hideDetails = false
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    return await scheduleNotificationAsync({
      content: {
        title: hideDetails ? 'Đến giờ uống thuốc' : `Nhắc uống thuốc: ${medicationName}`,
        body: hideDetails
          ? 'Mở ứng dụng để xem chi tiết liều thuốc của bạn'
          : dosage || 'Đã đến giờ uống thuốc của bạn',
        categoryIdentifier: CATEGORY_MEDICATION_REMINDER,
        sound: 'default',
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' ? MEDICATION_CHANNEL_ID : undefined,
      },
    });
  } catch {
    return null;
  }
}
