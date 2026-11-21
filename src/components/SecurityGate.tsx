// src/components/SecurityGate.tsx
// Lớp bảo vệ toàn ứng dụng:
// 1. Khoá app bằng Vân tay / Khuôn mặt / PIN khi mở app hoặc khi từ chế độ nền quay lại quá 30 giây.
// 2. Màn hình che riêng tư (Privacy Shield) tự động phủ kín khi gạt lên chế độ đa nhiệm (Recent Apps),
//    bảo vệ thông tin đơn thuốc mà không làm hỏng tính năng chụp ảnh chia sẻ Zalo.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  AppState,
  TouchableOpacity,
  Platform,
  type AppStateStatus,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { ShieldCheck, Fingerprint, Lock } from 'lucide-react-native';
import { loadSecurityPreferences } from '@/lib/securityConfig';

// Thời gian ân hạn (30 giây) để khi người dùng mở Camera chụp đơn thuốc hoặc Chia sẻ Zalo quay lại không bị khoá đột ngột
const RELOCK_GRACE_PERIOD_MS = 30_000;

interface SecurityGateProps {
  children: React.ReactNode;
}

export function SecurityGate({ children }: SecurityGateProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [showPrivacyShield, setShowPrivacyShield] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const biometricsEnabledRef = useRef(false);
  const privacyShieldEnabledRef = useRef(true);
  const backgroundedAtRef = useRef<number | null>(null);
  const isAuthenticatingRef = useRef(false);

  const promptBiometricUnlock = useCallback(async () => {
    if (Platform.OS === 'web' || isAuthenticatingRef.current) return;
    isAuthenticatingRef.current = true;
    setAuthError(null);

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Nếu người dùng đã xoá vân tay trong cài đặt máy, mở khoá để tránh kẹt vĩnh viễn
        setIsLocked(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực để mở Nhắc nhở uống thuốc',
        cancelLabel: 'Huỷ',
        fallbackLabel: 'Dùng mã PIN máy',
      });

      if (result.success) {
        setIsLocked(false);
        setAuthError(null);
      } else {
        setAuthError('Xác thực chưa thành công. Vui lòng thử lại.');
      }
    } catch {
      setAuthError('Không thể khởi tạo cảm biến sinh trắc học. Bấm thử lại.');
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, []);

  // Kiểm tra cài đặt bảo mật ngay lúc khởi động app
  useEffect(() => {
    let mounted = true;
    loadSecurityPreferences().then((prefs) => {
      if (!mounted) return;
      biometricsEnabledRef.current = prefs.biometricsEnabled;
      privacyShieldEnabledRef.current = prefs.privacyShieldEnabled;

      if (prefs.biometricsEnabled && Platform.OS !== 'web') {
        setIsLocked(true);
        promptBiometricUnlock();
      }
    });
    return () => {
      mounted = false;
    };
  }, [promptBiometricUnlock]);

  // Theo dõi vòng đời AppState để che màn hình Recent Apps & tự khoá lại khi rời app lâu
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      // Cập nhật lại cấu hình mới nhất từ SecureStore (phòng trường hợp người dùng vừa bật/tắt trong Cài đặt)
      const prefs = await loadSecurityPreferences();
      biometricsEnabledRef.current = prefs.biometricsEnabled;
      privacyShieldEnabledRef.current = prefs.privacyShieldEnabled;

      if (nextState === 'inactive' || nextState === 'background') {
        if (prefs.privacyShieldEnabled) {
          setShowPrivacyShield(true);
        }
        if (nextState === 'background' && backgroundedAtRef.current === null) {
          backgroundedAtRef.current = Date.now();
        }
      } else if (nextState === 'active') {
        setShowPrivacyShield(false);

        if (prefs.biometricsEnabled && backgroundedAtRef.current !== null) {
          const elapsed = Date.now() - backgroundedAtRef.current;
          backgroundedAtRef.current = null;
          if (elapsed >= RELOCK_GRACE_PERIOD_MS) {
            setIsLocked(true);
            promptBiometricUnlock();
          }
        } else {
          backgroundedAtRef.current = null;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [promptBiometricUnlock]);

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* Lớp phủ che màn hình khi chuyển sang đa nhiệm (Recent Apps Privacy Shield) */}
      {showPrivacyShield && !isLocked && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#0D9488',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            elevation: 99,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <ShieldCheck size={38} color="#FFFFFF" strokeWidth={2} />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
            Nhắc nhở uống thuốc
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6 }}>
            Thông tin sức khoẻ đang được bảo vệ riêng tư
          </Text>
        </View>
      )}

      {/* Màn hình Khoá Sinh trắc học / PIN */}
      {isLocked && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#F8FAFC',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
            zIndex: 9999,
            elevation: 100,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 26,
              backgroundColor: 'rgba(13, 148, 136, 0.12)',
              borderWidth: 1.5,
              borderColor: 'rgba(13, 148, 136, 0.3)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Lock size={36} color="#0D9488" strokeWidth={2} />
          </View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: '#0F172A',
              textAlign: 'center',
            }}
          >
            Ứng dụng đang được khoá
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#64748B',
              textAlign: 'center',
              marginTop: 8,
              lineHeight: 20,
            }}
          >
            Xác thực vân tay, khuôn mặt hoặc mã PIN máy để bảo vệ thông tin thuốc và đơn thuốc cá nhân.
          </Text>

          {authError ? (
            <Text
              style={{
                fontSize: 13,
                color: '#EF4444',
                fontWeight: '600',
                textAlign: 'center',
                marginTop: 14,
              }}
            >
              {authError}
            </Text>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={promptBiometricUnlock}
            style={{
              marginTop: 28,
              backgroundColor: '#0D9488',
              paddingHorizontal: 24,
              height: 52,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxWidth: 280,
            }}
          >
            <Fingerprint size={22} color="#FFFFFF" strokeWidth={2.2} />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: '700',
                marginLeft: 10,
              }}
            >
              Mở khoá ngay
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
