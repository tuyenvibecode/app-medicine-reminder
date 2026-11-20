# Nhật ký thay đổi (CHANGELOG)

Tất cả các thay đổi đáng chú ý của dự án ứng dụng **"Nhắc nhở uống thuốc"** sẽ được ghi lại trong file này.

## [1.0.0-bootstrap] - 2026-11-20

### Đã hoàn thành (Khởi tạo dự án theo workflow `/bootstrap`):
- **Cấu trúc & Nền tảng**:
  - Khởi tạo Expo Router (SDK 58) với TypeScript chế độ `strict`.
  - Cấu hình định danh ứng dụng `app.json`: Tên "Nhắc nhở uống thuốc", package Android `com.ahxian.nhacnhouongthuoc`, cấp đủ các quyền Android cần thiết (`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `USE_BIOMETRIC`, `CAMERA`).
  - Thiết lập cấu hình build APK độc lập qua EAS (`eas.json`).
  - Thiết lập file `.gitignore` bảo mật nghiêm ngặt (chặn commit `.env`, `*.keystore`, `*.jks`, `google-services.json`).
  - Tạo file `.env.example` chuẩn mẫu kết nối Supabase.

- **Giao diện & Theme (Design Tokens)**:
  - Cài đặt NativeWind v4 + React Native Reusables (bản shadcn/ui cho React Native).
  - Khởi tạo hệ thống màu sắc theo `design/UI-PROMPT.md`: Tông màu chủ đạo xanh ngọc y tế (Teal 600 - `#0D9488`), màu trạng thái rõ ràng (Xanh lá `taken`, Đỏ `missed`, Hổ phách cảnh báo sắp hết thuốc).
  - Tích hợp hiệu ứng nhún lò xo mượt (`react-native-reanimated`) và rung phản hồi xúc giác nhẹ (`expo-haptics`) trên nút bấm, tạo cảm giác tự nhiên, mịn màng và thủ công.
  - Xây dựng các UI Primitives: `Button`, `Card`, `Badge`, `Input`, `DoseCard`.

- **Màn hình & Điều hướng (Expo Router)**:
  - Thanh Tab điều hướng chính 4 mục: **Hôm nay**, **Tủ thuốc**, **Lịch sử**, **Cài đặt**.
  - **Màn hình Hôm nay**: Lời chào, thanh tiến độ % liều trong ngày, phân nhóm liều theo buổi (Sáng, Trưa, Tối), thẻ thuốc với ảnh viên thuốc to rõ và nút **Đã uống** 1-chạm.
  - **Màn hình Tủ thuốc**: Tìm kiếm thuốc theo tên, hiển thị số lượng tồn kho và nhãn cảnh báo khi thuốc sắp hết.
  - **Màn hình Lịch sử**: Thống kê chuỗi ngày duy trì uống đúng giờ (Streak), tỷ lệ tuân thủ, và nhật ký các lần uống gần nhất.
  - **Màn hình Cài đặt**: Cài đặt bảo mật mở khóa bằng vân tay/PIN thiết bị (`expo-local-authentication`), bật/tắt chuông báo ưu tiên cao, tuỳ chọn ẩn tên thuốc ở màn hình khoá.
  - **Màn hình Thêm thuốc**: Chụp ảnh viên thuốc hoặc chọn từ máy ảnh, nhập tên, liều lượng, số lượng tồn kho và chọn khung giờ nhắc nhở.
  - **Màn hình Đăng nhập**: Kết nối xác thực Supabase Auth với SecureStore.

- **Cơ sở dữ liệu & Thông báo**:
  - Migration ban đầu `supabase/migrations/0001_init.sql` (bật RLS toàn diện cho `medications`, `schedules`, `dose_logs`).
  - Khởi tạo Supabase client `src/lib/supabase.ts` sử dụng `LargeSecureStoreAdapter` (Keystore Android) và lắng nghe vòng đời `AppState`.
  - Khởi tạo cấu hình kênh thông báo Android ưu tiên cao `src/lib/notifications.ts`.
