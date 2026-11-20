// src/lib/secureStorage.ts
// Adapter lưu session bảo mật bằng Expo SecureStore (Keystore Android)
// Tuân thủ rule 01-security: Không lưu token vào AsyncStorage thông thường.

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Xử lý giới hạn kích thước ~2KB của SecureStore trên Android
 * bằng cách chia nhỏ chuỗi dài thành các chunk.
 */
const CHUNK_SIZE = 1800;

export const LargeSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      }

      // Đọc chunk count nếu có
      const countStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        let result = '';
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (chunk === null) return null;
          result += chunk;
        }
        return result;
      }

      // Ngược lại đọc key thông thường
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return;
      }

      // Xoá các chunk cũ nếu trước đó có chunking
      await LargeSecureStoreAdapter.removeItem(key);

      if (value.length > CHUNK_SIZE) {
        const chunks = Math.ceil(value.length / CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunks`, chunks.toString());
        for (let i = 0; i < chunks; i++) {
          const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
        }
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      // Bỏ qua lỗi nếu lưu trữ tạm thời gặp sự cố
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        return;
      }

      const countStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_chunks`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore cleanup error
    }
  },
};
