# Bộ cấu hình Antigravity cho app Nhắc uống thuốc (v2)

## Cách dùng
1. Giải nén, copy toàn bộ vào **gốc project** (thư mục `.agent/` phải nằm ở gốc, cùng cấp `package.json`).
2. Mở thư mục bằng Antigravity.
3. Làm UI mới: dán prompt trong `design/UI-PROMPT.md` vào Google Stitch, export **.zip + Project Brief**,
   bỏ vào `design/stitch/`, rồi gõ `/redesign-ui`.
4. Lần đầu dựng project: gõ `/bootstrap` (bỏ qua bước tạo project nếu đã có).

## Có gì trong này
```
.agent/
  rules/                       # luật luôn áp dụng
    00-project-overview.md     # app làm gì, 5 chức năng, công nghệ
    01-security.md             # bảo mật (APK + ảnh + dữ liệu gia đình)
    02-code-style.md           # cấu trúc code, comment, cách báo cáo
    03-ui-design.md            # NativeWind + React Native Reusables, bám Stitch
    04-medical-safety.md       # an toàn y tế: AI không gợi ý thuốc, dược sĩ duyệt
  skills/                      # kiến thức chuyên sâu, agent tự đọc khi cần
    medication-reminders/      # thông báo nhắc thuốc trên Android
    supabase-secure-backend/   # schema + RLS + đăng nhập an toàn
    android-apk-release/       # build và ký APK
    medicine-photos/           # ảnh viên thuốc, lưu riêng tư, xoay 360 (tuỳ chọn)
    drug-catalog/              # danh mục thuốc do dược sĩ nhập, import Excel, đọc hộp thuốc
    family-suggestions/        # gợi ý thuốc từ dược sĩ gia đình
  workflows/                   # lệnh /tên
    bootstrap.md               # /bootstrap               khởi tạo dự án
    redesign-ui.md             # /redesign-ui             dựng lại UI theo Stitch mới
    polish-ui.md               # /polish-ui               làm UI đẹp và mượt hơn
    add-feature.md             # /add-feature             thêm tính năng bất kỳ
    add-ui-screen.md           # /add-ui-screen           thêm màn hình UI mới
    add-medicine-photo.md      # /add-medicine-photo      ảnh viên thuốc
    add-family-suggestions.md  # /add-family-suggestions  gợi ý thuốc từ dược sĩ gia đình
    build-apk.md               # /build-apk               ra file APK
    security-audit.md          # /security-audit          rà soát bảo mật
design/
  UI-PROMPT.md                 # prompt render UI cho Stitch
  stitch/                      # chỗ bỏ file thiết kế export từ Stitch
supabase/migrations/
  0002_family_prescriptions.sql  # gia đình, danh mục, gợi ý, đơn thuốc, kho ảnh (có RLS)
```

## Thứ tự làm gợi ý
1. `/bootstrap` -> khung app + nhắc thuốc chạy được
2. `/redesign-ui` -> giao diện theo Stitch mới
3. `/add-medicine-photo` -> ảnh viên thuốc
4. Đơn thuốc (dùng `/add-feature`, bảng đã có trong migration 0002)
5. `/add-family-suggestions` -> chức năng dược sĩ gia đình (làm sau cùng, cần chốt vài câu hỏi với vợ)

## Việc bạn phải tự làm tay
- Tạo project Supabase **riêng cho app thuốc**, chạy SQL, tạo tài khoản, rồi **tắt sign-up**
- Tạo tài khoản expo.dev để build APK; **backup keystore** sau lần build đầu
- Test nhắc thuốc trên máy thật (Expo Go không đủ)
- Hỏi vợ về quy định kê thuốc và loại thuốc dùng trong chức năng gợi ý
