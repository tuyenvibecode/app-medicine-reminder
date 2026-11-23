// Mục đích: Khởi tạo Supabase client duy nhất dùng SecureStore và tự làm mới phiên theo AppState.
// src/lib/supabase.ts
// Khởi tạo Supabase Client duy nhất cho toàn ứng dụng
// Sử dụng SecureStore bảo mật và quản lý autoRefresh theo vòng đời AppState

import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { LargeSecureStoreAdapter } from './secureStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: LargeSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Quản lý auto-refresh token theo trạng thái ứng dụng (tiết kiệm pin & an toàn)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
