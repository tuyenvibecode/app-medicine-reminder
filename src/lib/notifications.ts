// src/lib/notifications.ts
// Quản lý thông báo local nhắc uống thuốc bằng expo-notifications
// Tuân thủ skill medication-reminders: chạy local độc lập mạng

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const MEDICATION_CHANNEL_ID = 'medication-reminders-high';
export const ACTION_TAKEN = 'ACTION_TAKEN';
export const ACTION_SNOOZE = 'ACTION_SNOOZE';
export const CATEGORY_MEDICATION_REMINDER = 'CATEGORY_MEDICATION_REMINDER';

// Cấu hình cách thông báo hiển thị khi app đang mở
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Khởi tạo kênh thông báo ưu tiên cao (Android) và danh mục hành động (Đã uống / Nhắc lại)
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    // 1. Kênh thông báo chính cho giờ uống thuốc (Âm thanh lớn, rung, nổi lên màn hình)
    await Notifications.setNotificationChannelAsync(MEDICATION_CHANNEL_ID, {
      name: 'Nhắc uống thuốc',
      description: 'Thông báo báo thức nhắc uống thuốc đúng giờ',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D9488',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }

  // 2. Thiết lập hành động nhanh trên thông báo (1 chạm: Đã uống hoặc Hoãn 15 phút)
  await Notifications.setNotificationCategoryAsync(CATEGORY_MEDICATION_REMINDER, [
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
}

/**
 * Yêu cầu quyền thông báo từ người dùng
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}
