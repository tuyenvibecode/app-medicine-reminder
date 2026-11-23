---
trigger: model_decision
description: Đọc khi làm hoặc sửa giao diện, màn hình, component, theme, hiệu ứng - quy tắc NativeWind + React Native Reusables, bám thiết kế Stitch, cỡ chữ và vùng bấm, dark mode
---

# Quy tắc UI

## Bộ UI
- Dùng **React Native Reusables** (shadcn/ui cho React Native) trên nền **NativeWind**.
  Làm theo tài liệu chính thức tại reactnativereusables.com/docs để cài đặt, không tự bịa lệnh.
- Component sao chép vào `src/components/ui/` (kiểu shadcn: code thuộc về mình, sửa thoải mái).
- Màu, bo góc, font khai báo bằng **biến theme** (light + dark) ở một chỗ duy nhất
  (theo hướng dẫn của Reusables), trích từ thiết kế Stitch. Không hard-code màu trong màn hình.
- Không dùng thêm bộ UI khác (không trộn Paper, NativeBase, v.v.).
- Icon dùng một bộ duy nhất (`lucide-react-native` hoặc theo Reusables).

## Nguồn thiết kế
- Thiết kế ở **Google Stitch**, export vào `design/stitch/` (ảnh từng màn hình là tham chiếu chính,
  kèm HTML/CSS và Project Brief nếu có).
- Stitch xuất **web**, không phải React Native. Phải "dịch" sang component RN, không copy nguyên.
- Việc đầu tiên: trích design tokens (màu, font, bo góc, spacing, đổ bóng) vào theme và
  **cho chủ dự án xác nhận bảng màu + font** trước khi làm tiếp.
- Từ giờ UI mới do Antigravity tự làm, không cần quay lại Stitch. Ghi quyết định thiết kế mới vào
  `design/DESIGN_NOTES.md`.

## Làm một màn hình mới
1. Xem `design/stitch/`, `src/components/ui/`, `design/DESIGN_NOTES.md` để lấy phong cách.
2. Dùng lại component sẵn có trước. Thiếu thì thêm component Reusables tương ứng.
3. Màn lớn / phức tạp: mô tả bố cục bằng chữ cho chủ dự án duyệt trước khi code.

## Nguyên tắc thiết kế cho app thuốc
- **Dễ đọc, dễ bấm**: chữ tối thiểu 16sp, vùng bấm tối thiểu 48x48dp, tương phản đạt WCAG AA.
- Người lớn tuổi cũng dùng được: nút lớn, ít bước, nhãn rõ.
- Màn "Hôm nay": nút **Đã uống** to, bấm 1 chạm.
- **Ảnh viên thuốc là hình chủ đạo** của thẻ thuốc và màn hình nhắc. Ảnh bo tròn, nền sạch.
- Không chỉ dựa vào màu để phân biệt trạng thái: thêm icon + chữ (Đã uống / Bỏ qua / Quên).
- Có dark mode.
- Mọi màn hình dữ liệu có đủ 3 trạng thái: đang tải (skeleton), lỗi, rỗng.

## Hiệu ứng
- `react-native-reanimated`: nhấn nút nhún nhẹ, danh sách hiện fade/slide, chuyển cảnh mượt,
  hiệu ứng xác nhận khi bấm "Đã uống". 150-300ms, không lòe loẹt.
- `expo-haptics` rung nhẹ cho hành động quan trọng.
- Tôn trọng cài đặt "giảm chuyển động" của hệ thống.
- Danh sách dài dùng `FlatList`, tránh render thừa.

## Kiểm tra trước khi báo xong
- Màn hình nhỏ (360dp) và lớn; chữ to theo hệ thống không vỡ layout; nội dung dài không tràn.
- `accessibilityLabel` cho nút chỉ có icon.
- Ảnh dùng `expo-image` có cache, placeholder khi đang tải.
