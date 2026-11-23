// Mục đích: Hộp thoại thông báo/xác nhận đồng bộ giao diện (thay cho Alert hệ thống) dùng chung toàn app.
// src/components/ui/app-dialog.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import {
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Bell,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export interface AppAlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export type AppAlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface DialogRequest {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  variant: AppAlertVariant;
}

type DialogListener = (req: DialogRequest) => void;
let activeListener: DialogListener | null = null;
const pendingQueue: DialogRequest[] = [];

function inferVariant(title: string, buttons: AppAlertButton[]): AppAlertVariant {
  if (buttons.some((b) => b.style === 'destructive')) return 'danger';
  const lower = title.toLowerCase();
  if (lower.includes('xoá') || lower.includes('xóa') || lower.includes('đăng xuất')) {
    return 'danger';
  }
  if (
    lower.includes('lỗi') ||
    lower.includes('thất bại') ||
    lower.includes('chưa') ||
    lower.includes('không ') ||
    lower.includes('cảnh báo') ||
    lower.includes('thiếu')
  ) {
    return 'warning';
  }
  if (
    lower.includes('thành công') ||
    lower.includes('đã ') ||
    lower.includes('hoàn tất') ||
    lower.includes('đang phát')
  ) {
    return 'success';
  }
  return 'info';
}

/**
 * Hiển thị hộp thoại thông báo / xác nhận đồng bộ giao diện ứng dụng.
 * Tham số tương thích trực tiếp với Alert.alert(title, message, buttons).
 */
export function showAppAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  variant?: AppAlertVariant
): void {
  const normalizedButtons: AppAlertButton[] =
    buttons && buttons.length > 0 ? buttons : [{ text: 'Đóng', style: 'default' }];

  const req: DialogRequest = {
    title,
    message,
    buttons: normalizedButtons,
    variant: variant || inferVariant(title, normalizedButtons),
  };

  if (activeListener) {
    activeListener(req);
  } else {
    pendingQueue.push(req);
  }
}

export const AppAlert = {
  alert: showAppAlert,
};

export function AppDialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>(() =>
    pendingQueue.splice(0, pendingQueue.length)
  );

  useEffect(() => {
    activeListener = (req) => {
      setQueue((prev) => [...prev, req]);
    };
    return () => {
      activeListener = null;
    };
  }, []);

  const current = queue[0] || null;

  const dismissCurrent = () => {
    setQueue((prev) => prev.slice(1));
  };

  const handlePressButton = (btn: AppAlertButton) => {
    try {
      if (btn.style === 'destructive') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (btn.style !== 'cancel') {
        Haptics.selectionAsync();
      }
    } catch {}

    dismissCurrent();
    if (btn.onPress) {
      setTimeout(() => btn.onPress?.(), 60);
    }
  };

  const handleBackdropClose = () => {
    if (!current) return;
    const cancelBtn = current.buttons.find((b) => b.style === 'cancel');
    if (cancelBtn) {
      handlePressButton(cancelBtn);
    } else if (current.buttons.length === 1) {
      handlePressButton(current.buttons[0]);
    }
  };

  if (!current) return null;

  const palette =
    current.variant === 'danger'
      ? {
          outerBg: 'rgba(239, 68, 68, 0.14)',
          innerBg: '#EF4444',
          icon: <Trash2 size={24} color="#FFFFFF" strokeWidth={2.2} />,
        }
      : current.variant === 'warning'
        ? {
            outerBg: 'rgba(245, 158, 11, 0.14)',
            innerBg: '#F59E0B',
            icon: <AlertTriangle size={24} color="#FFFFFF" strokeWidth={2.2} />,
          }
        : current.variant === 'success'
          ? {
              outerBg: 'rgba(13, 148, 136, 0.14)',
              innerBg: '#0D9488',
              icon: <CheckCircle2 size={25} color="#FFFFFF" strokeWidth={2.3} />,
            }
          : {
              outerBg: 'rgba(13, 148, 136, 0.12)',
              innerBg: '#0D9488',
              icon: <Bell size={23} color="#FFFFFF" strokeWidth={2.2} />,
            };

  const isSideBySide = current.buttons.length === 2;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleBackdropClose}
    >
      <View className="flex-1 bg-black/55 justify-center items-center px-6">
        <View
          className="w-full max-w-sm bg-card border border-border/80 px-6 pt-6 pb-5 items-center"
          style={{ borderRadius: 28 }}
        >
          {/* Icon tròn nhận diện loại thông báo */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: palette.outerBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: palette.innerBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {palette.icon}
            </View>
          </View>

          <Text className="text-lg font-extrabold text-foreground text-center">
            {current.title}
          </Text>

          {!!current.message && (
            <Text className="text-sm text-muted-foreground text-center mt-2 leading-relaxed">
              {current.message}
            </Text>
          )}

          {/* Nút hành động */}
          <View
            className={
              isSideBySide ? 'w-full flex-row gap-2.5 mt-6' : 'w-full gap-2.5 mt-6'
            }
          >
            {current.buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isPrimary = !isCancel && !isDestructive;

              return (
                <TouchableOpacity
                  key={`${btn.text || 'btn'}-${idx}`}
                  activeOpacity={0.8}
                  onPress={() => handlePressButton(btn)}
                  style={{
                    flex: isSideBySide ? 1 : undefined,
                    height: 48,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 14,
                    backgroundColor: isDestructive
                      ? '#EF4444'
                      : isPrimary
                        ? '#0D9488'
                        : 'transparent',
                    borderWidth: isCancel ? 1 : 0,
                    borderColor: isCancel ? '#CBD5E1' : 'transparent',
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: isCancel ? '#64748B' : '#FFFFFF',
                    }}
                  >
                    {btn.text || 'Đồng ý'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
