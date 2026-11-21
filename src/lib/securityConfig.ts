// src/lib/securityConfig.ts
// Lưu và đọc cấu hình bảo mật (Khoá vân tay, Che màn hình đa nhiệm) bằng SecureStore (Keystore Android)
// Tuân thủ rule 01-security.md: không dùng AsyncStorage cho dữ liệu bảo mật.

import { LargeSecureStoreAdapter } from './secureStorage';
import type { ReminderSettings } from '@/types';

const KEY_BIOMETRICS_ENABLED = 'sec_biometrics_enabled';
const KEY_PRIVACY_SHIELD_ENABLED = 'sec_privacy_shield_enabled';
const KEY_REMINDER_SETTINGS = 'app_reminder_settings_v1';

export interface SecurityPreferences {
  biometricsEnabled: boolean;
  privacyShieldEnabled: boolean;
}

export async function loadSecurityPreferences(): Promise<SecurityPreferences> {
  try {
    const [bio, shield] = await Promise.all([
      LargeSecureStoreAdapter.getItem(KEY_BIOMETRICS_ENABLED),
      LargeSecureStoreAdapter.getItem(KEY_PRIVACY_SHIELD_ENABLED),
    ]);

    return {
      biometricsEnabled: bio === 'true',
      // Mặc định bật che màn hình đa nhiệm (Recent Apps) để bảo vệ riêng tư sức khoẻ
      privacyShieldEnabled: shield === null ? true : shield === 'true',
    };
  } catch {
    return {
      biometricsEnabled: false,
      privacyShieldEnabled: true,
    };
  }
}

export async function saveBiometricsEnabled(enabled: boolean): Promise<void> {
  await LargeSecureStoreAdapter.setItem(KEY_BIOMETRICS_ENABLED, enabled ? 'true' : 'false');
}

export async function savePrivacyShieldEnabled(enabled: boolean): Promise<void> {
  await LargeSecureStoreAdapter.setItem(KEY_PRIVACY_SHIELD_ENABLED, enabled ? 'true' : 'false');
}

export async function loadReminderSettings(): Promise<Partial<ReminderSettings> | null> {
  try {
    const raw = await LargeSecureStoreAdapter.getItem(KEY_REMINDER_SETTINGS);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<ReminderSettings>;
  } catch {
    return null;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  try {
    await LargeSecureStoreAdapter.setItem(KEY_REMINDER_SETTINGS, JSON.stringify(settings));
  } catch {}
}
