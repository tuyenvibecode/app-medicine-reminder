---
trigger: always_on
description: Tổng quan ngắn gọn dự án app nhắc uống thuốc - luôn áp dụng
---

# App quản lý & nhắc uống thuốc (Android, cài bằng APK)

Chức năng: (1) nhắc uống thuốc bằng thông báo local, (2) ảnh viên thuốc hiện lúc nhắc,
(3) xoay 360 tuỳ chọn, (4) lưu đơn thuốc để đưa dược sĩ, (5) gợi ý thuốc từ dược sĩ trong gia đình.

Công nghệ cố định: Expo + React Native (TypeScript, Expo Router), Supabase (Auth, Postgres + RLS,
Storage riêng tư, Edge Functions), NativeWind + React Native Reusables, expo-notifications,
react-native-reanimated. Giao diện tiếng Việt. Không đưa lên Google Play.

Người dùng là designer, không phải dev chuyên nghiệp: giải thích ngắn, dễ hiểu, comment tiếng Việt.

Luôn nhớ:
- Nhắc thuốc chạy local, không phụ thuộc mạng hay server.
- Bảo mật và an toàn y tế: xem 01-security.md và 04-medical-safety.md.
- Chi tiết khác nằm ở rules `02-code-style`, `03-ui-design` (agent tự đọc khi cần) và các skills.
- Đầu mỗi cuộc trò chuyện đọc `PROGRESS.md` để biết đang làm tới đâu.
