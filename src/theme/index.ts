// Mục đích: Định nghĩa bảng màu sáng/tối và token giao diện dùng chung cho toàn ứng dụng.
// src/theme/index.ts
// Bảng màu & tokens theo phong cách shadcn (React Native Reusables)
// Tông màu chủ đạo: Teal (xanh ngọc dịu mắt, đáng tin cậy, y tế hiện đại)

export const NAV_THEME = {
  light: {
    dark: false,
    colors: {
      background: 'hsl(210 40% 98%)',
      border: 'hsl(214 32% 91%)',
      card: 'hsl(0 0% 100%)',
      notification: 'hsl(0 84% 60%)',
      primary: 'hsl(173 80% 32%)',
      text: 'hsl(222 47% 11%)',
    },
  },
  dark: {
    dark: true,
    colors: {
      background: 'hsl(192 35% 6%)',
      border: 'hsl(192 20% 17%)',
      card: 'hsl(192 28% 11%)',
      notification: 'hsl(0 75% 55%)',
      primary: 'hsl(168 76% 46%)',
      text: 'hsl(210 40% 98%)',
    },
  },
};

export const COLORS = {
  primary: '#0D9488', // Teal 600
  primaryDark: '#14B8A6', // Teal 500
  primaryLight: '#CCFBF1', // Teal 100
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  danger: '#EF4444', // Red 500
  neutralBg: '#F8FAFC',
  cardBg: '#FFFFFF',
};
