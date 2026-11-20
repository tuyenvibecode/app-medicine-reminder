---
trigger: always_on
description: Tổng quan dự án app nhắc uống thuốc (v2) - luôn áp dụng
---

# Dự án: App quản lý & nhắc uống thuốc

## Chức năng
1. **Nhắc uống thuốc (chính)**: thông báo local đúng giờ, ghi lại đã uống / bỏ qua / quên.
2. **Ảnh viên thuốc**: khi thêm thuốc thì chụp hoặc chọn ảnh viên thuốc. Tới giờ uống,
   màn hình nhắc hiện ảnh viên thuốc đó cho dễ nhận biết.
3. **Xoay 360 độ (tuỳ chọn, làm sau)**: vuốt để xoay viên thuốc. Nếu nặng hoặc khó thì bỏ,
   xem skill `medicine-photos`.
4. **Lưu đơn thuốc**: ảnh toa hoặc danh sách thuốc đã mua, gắn với bệnh. Có màn hình
   "Đưa cho dược sĩ" để lần sau mua thuốc chỉ cần đưa cho dược sĩ xem.
5. **Gợi ý thuốc từ dược sĩ trong gia đình**: người nhà gửi triệu chứng, dược sĩ (vợ chủ dự án)
   gợi ý thuốc từ xa, người bệnh bấm một nút để thêm vào lịch nhắc.
   Đọc kỹ rule `04-medical-safety.md` và skills `family-suggestions`, `drug-catalog`.

App chỉ cài bằng **file APK** (sideload). **Không** đưa lên Google Play / App Store.

## Công nghệ (cố định, không tự đổi)
- **React Native + Expo** (TypeScript), Expo Router, build APK bằng EAS
- **Supabase** (Auth + Postgres + RLS + Storage riêng tư + Edge Functions)
- **NativeWind** + **React Native Reusables** (bản shadcn/ui cho React Native) cho giao diện
- `expo-notifications` (nhắc thuốc local), `expo-secure-store`, `expo-local-authentication`
- `expo-image-picker` / `expo-camera`, `expo-image-manipulator` (nén ảnh), `expo-image`
- `react-native-reanimated` cho hiệu ứng
- State: React Query (chọn 1 và giữ nhất quán)
- Giao diện: **Tiếng Việt**

> shadcn/ui bản web (React DOM) **không chạy được** trong React Native. Dùng React Native Reusables
> thay thế. Xem rule `03-ui-design.md`.

## Vì sao Supabase
- Dữ liệu dạng bảng (thuốc, lịch, đơn, gợi ý) hợp Postgres
- RLS bảo vệ dữ liệu ngay ở database, quan trọng vì anon key nằm trong APK
- Có sẵn Auth, Storage (ảnh), Realtime và Edge Functions (gọi AI bằng khoá bí mật phía server)
- Gói Free chỉ cho **2 project hoạt động**; project tự pause sau 1 tuần không dùng.
  App thuốc dùng **project riêng**, không chung với app khác (dữ liệu sức khoẻ).

## Nguyên tắc nhắc thuốc
Nhắc **không phụ thuộc server**. Lịch lưu trên Supabase để đồng bộ nhưng thông báo luôn được
đặt local trên máy. Đọc skill `medication-reminders`.

## Về người dùng (chủ dự án)
- Xuất thân designer, **không phải coder chuyên nghiệp**
- Giải thích ngắn gọn, dễ hiểu; comment code bằng tiếng Việt
- Khi gặp lỗi: giải thích nguyên nhân bằng lời thường trước, rồi mới sửa
- Chủ dự án có mắt thiết kế tốt: khi làm UI hãy mô tả bố cục để họ duyệt và chỉnh

## Về UI
- UI gốc ở **Google Stitch**, export vào `design/stitch/`. Prompt render UI mới nằm ở `design/UI-PROMPT.md`.
- Khi cần thêm màn hình mới: làm trực tiếp tại đây, bám design tokens, không cần quay lại Stitch.
