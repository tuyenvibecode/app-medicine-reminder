---
description: Khởi tạo dự án từ đầu - tạo project Expo, cài thư viện, dựng theme từ Stitch, nối Supabase
---

# /bootstrap - Khởi tạo dự án

Chạy một lần khi bắt đầu. Làm lần lượt, mỗi bước xong báo ngắn gọn.

1. **Đọc bối cảnh**: đọc toàn bộ `.agent/rules/` và `design/stitch/`. Tóm tắt lại bằng 5 dòng
   cho chủ dự án xác nhận mình hiểu đúng app.

2. **Tạo project Expo (TypeScript + Expo Router)**
   - Nếu chủ dự án **đã tạo sẵn project Expo** trong thư mục (có `package.json`, `app.json`) thì
     **bỏ qua bước này**, kiểm tra project chạy được rồi làm tiếp.
   - Chưa có thì `npx create-expo-app@latest` vào thư mục hiện tại (template TypeScript / tabs)
   - Đặt `android.package` = `com.ahxian.thuoc` (hỏi chủ dự án nếu muốn tên khác)

3. **Cài thư viện cốt lõi**
   - `@supabase/supabase-js`, `expo-secure-store`, `expo-notifications`, `expo-device`,
     `expo-local-authentication`, `expo-build-properties`
   - Ảnh: `expo-image-picker`, `expo-image-manipulator`, `expo-image`
   - Hiệu ứng: `react-native-reanimated`, `expo-haptics`
   - `@tanstack/react-query`, `zod`, `date-fns`
   - **NativeWind + React Native Reusables** (làm theo tài liệu chính thức ở reactnativereusables.com/docs)
   - Dùng `npx expo install` để đúng phiên bản tương thích

4. **Dựng theme từ Stitch**
   - Trích màu (light + dark), font, bo góc, spacing từ `design/stitch/` vào biến theme của Reusables
   - **Dừng lại, cho chủ dự án xem bảng màu + font đã trích và xác nhận**

5. **Nối Supabase**
   - Tạo `src/lib/supabase.ts` theo skill `supabase-secure-backend` (SecureStore adapter)
   - Tạo `.env.example` (chỉ URL + anon key, để trống giá trị) và thêm `.env` vào `.gitignore`
   - Tạo `supabase/migrations/0001_init.sql` từ skill (file `0002_family_prescriptions.sql`
     đã có sẵn trong bộ này, chạy sau 0001 khi bắt đầu làm gia đình / đơn thuốc / ảnh)
   - Nhắc chủ dự án dùng **project Supabase riêng cho app thuốc** (gói Free chỉ cho 2 project hoạt động)
   - **Nhắc chủ dự án chạy SQL trong Supabase và tạo tài khoản, rồi tắt sign-up**

6. **Dựng khung điều hướng**: màn Đăng nhập + 4 tab (Hôm nay, Thuốc, Lịch sử, Cài đặt)
   với nội dung tạm, đúng phong cách Stitch.

7. **Cấu hình build**: tạo `eas.json` và cấu hình `app.json` theo skill `android-apk-release`.

8. **Kiểm tra cuối**: `npx tsc --noEmit`, `npm run lint`, app chạy được.
   Tạo `README.md` hướng dẫn chạy dự án bằng tiếng Việt, và `CHANGELOG.md`.

Báo cáo theo mẫu trong rule `02-code-style.md`.
