// Mục đích: Lắng nghe thông báo nhắc uống thuốc đến hoặc khi người dùng chạm vào để mở màn hình Mèo báo thức đúng giờ.
// src/components/ReminderNotificationListener.tsx

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { format } from 'date-fns';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  dismissNotificationAsync,
} from 'expo-notifications';
import { useAppStore } from '@/context/AppContext';
import { ACTION_TAKEN, ACTION_SNOOZE } from '@/lib/notifications';

interface ReminderPayload {
  type?: string;
  doseId?: string;
  medicationName?: string;
  dosage?: string;
  scheduledTime?: string;
  imageUrl?: string;
}

/**
 * Tính số mili-giây còn lại tới đúng phút HH:mm hôm nay (nếu thông báo hệ thống đến sớm vài chục giây)
 */
function getMsUntilScheduledTime(scheduledTime?: string): number {
  if (!scheduledTime || !/^\d{2}:\d{2}$/.test(scheduledTime)) return 0;
  const [hStr, mStr] = scheduledTime.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  const diff = target.getTime() - now.getTime();
  // Chỉ trì hoãn nếu đến sớm dưới 5 phút (tránh trì hoãn khi người dùng mở thông báo ngày hôm trước)
  if (diff > 2000 && diff <= 5 * 60 * 1000) {
    return diff;
  }
  return 0;
}

export function ReminderNotificationListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { doses, getDosesForDate, takeDose, snoozeDose } = useAppStore();

  const dosesRef = useRef(doses);
  const getDosesForDateRef = useRef(getDosesForDate);
  const pathnameRef = useRef(pathname);
  const lastHandledIdRef = useRef<string | null>(null);
  const firedDoseKeysRef = useRef<Set<string>>(new Set());
  const pendingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    dosesRef.current = doses;
  }, [doses]);

  useEffect(() => {
    getDosesForDateRef.current = getDosesForDate;
  }, [getDosesForDate]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Kiểm tra xem liều thuốc này hôm nay đã được xác nhận uống rồi chưa (tránh báo lại khi thông báo OS đến trễ)
    const isAlreadyTakenToday = (payload: ReminderPayload): boolean => {
      const todayDoses = getDosesForDateRef.current(new Date());
      if (payload.doseId) {
        const byId = todayDoses.find((d) => d.id === payload.doseId);
        if (byId) return byId.status === 'taken';
      }
      if (payload.medicationName && payload.scheduledTime) {
        const byNameTime = todayDoses.find(
          (d) =>
            d.medicationName === payload.medicationName &&
            d.scheduledTime === payload.scheduledTime
        );
        if (byNameTime) return byNameTime.status === 'taken';
      }
      return false;
    };

    const openAlarmNow = (payload: ReminderPayload, notifId?: string) => {
      if (isAlreadyTakenToday(payload)) {
        if (notifId) dismissNotificationAsync(notifId).catch(() => {});
        return;
      }
      if (pathnameRef.current === '/reminder/alarm') return;

      const todayKey = format(new Date(), 'yyyy-MM-dd');
      const doseKey = `${todayKey}::${payload.doseId || payload.medicationName || ''}::${payload.scheduledTime || ''}`;
      if (firedDoseKeysRef.current.has(doseKey)) return;
      firedDoseKeysRef.current.add(doseKey);

      router.push({
        pathname: '/reminder/alarm' as any,
        params: {
          doseId: payload.doseId || '',
          medicationName: payload.medicationName || 'Thuốc theo lịch nhắc',
          dosage: payload.dosage || 'Uống theo hướng dẫn',
          scheduledTime: payload.scheduledTime || '',
          imageUrl: payload.imageUrl || '',
        },
      });
    };

    const scheduleOrOpenAlarm = (
      payload: ReminderPayload,
      notifId: string,
      fromUserTap: boolean
    ) => {
      if (payload.type !== 'MEDICATION_REMINDER') return;
      if (lastHandledIdRef.current === notifId) return;
      lastHandledIdRef.current = notifId;

      if (isAlreadyTakenToday(payload)) {
        dismissNotificationAsync(notifId).catch(() => {});
        return;
      }

      // Nếu người dùng tự chạm vào thông báo -> mở ngay lập tức
      if (fromUserTap) {
        openAlarmNow(payload, notifId);
        return;
      }

      // Nếu Android bắn thông báo sớm vài chục giây -> chờ đúng giây :00 rồi mới bật màn Mèo báo thức
      const delayMs = getMsUntilScheduledTime(payload.scheduledTime);
      if (delayMs > 0) {
        const timer = setTimeout(() => {
          openAlarmNow(payload, notifId);
        }, delayMs);
        pendingTimersRef.current.push(timer);
      } else {
        openAlarmNow(payload, notifId);
      }
    };

    const handleNotificationResponse = (
      actionId: string,
      payload: ReminderPayload,
      notifId: string
    ) => {
      if (payload.type !== 'MEDICATION_REMINDER') return;

      const matchedDose = payload.doseId
        ? dosesRef.current.find((d) => d.id === payload.doseId)
        : undefined;

      if (actionId === ACTION_TAKEN && matchedDose) {
        takeDose(matchedDose);
        return;
      }

      if (actionId === ACTION_SNOOZE && matchedDose) {
        snoozeDose(matchedDose);
        return;
      }

      scheduleOrOpenAlarm(payload, notifId, true);
    };

    // 1. Khi thông báo đến lúc app đang mở -> bật màn hình Mèo báo thức đúng giây
    const receivedSub = addNotificationReceivedListener((notification) => {
      const payload = (notification.request.content.data || {}) as ReminderPayload;
      scheduleOrOpenAlarm(payload, notification.request.identifier, false);
    });

    // 2. Khi người dùng chạm vào thông báo hoặc bấm nút hành động nhanh
    const responseSub = addNotificationResponseReceivedListener((response) => {
      const payload = (response.notification.request.content.data || {}) as ReminderPayload;
      handleNotificationResponse(
        response.actionIdentifier,
        payload,
        response.notification.request.identifier
      );
    });

    // 3. Trường hợp app đang tắt hẳn và được mở lên bằng cách chạm vào thông báo
    getLastNotificationResponseAsync()
      .then((lastResponse) => {
        if (!lastResponse) return;
        const payload = (lastResponse.notification.request.content.data || {}) as ReminderPayload;
        handleNotificationResponse(
          lastResponse.actionIdentifier,
          payload,
          lastResponse.notification.request.identifier
        );
      })
      .catch(() => {});

    // 4. Đồng hồ chính xác khi app đang mở (foreground): kiểm tra mỗi 3 giây
    //    để bật đúng phút HH:mm:00 ngay cả khi Expo Go hoặc Android tối ưu pin làm trễ thông báo OS
    const exactClockInterval = setInterval(() => {
      if (pathnameRef.current === '/reminder/alarm') return;
      const now = new Date();
      const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const todayKey = format(now, 'yyyy-MM-dd');
      const todayDoses = getDosesForDateRef.current(now);

      for (const dose of todayDoses) {
        if (dose.status === 'taken') continue;
        if (dose.scheduledTime !== currentHHmm) continue;

        const doseKey = `${todayKey}::${dose.id}::${dose.scheduledTime}`;
        if (firedDoseKeysRef.current.has(doseKey)) continue;

        openAlarmNow({
          type: 'MEDICATION_REMINDER',
          doseId: dose.id,
          medicationName: dose.medicationName,
          dosage: dose.dosage,
          scheduledTime: dose.scheduledTime,
          imageUrl: dose.image || '',
        });
        break;
      }
    }, 3000);

    return () => {
      receivedSub.remove();
      responseSub.remove();
      clearInterval(exactClockInterval);
      pendingTimersRef.current.forEach(clearTimeout);
      pendingTimersRef.current = [];
    };
  }, [router, takeDose, snoozeDose]);

  return null;
}
