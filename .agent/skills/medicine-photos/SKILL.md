---
name: medicine-photos
description: Chụp hoặc chọn ảnh viên thuốc, nén ảnh, lưu an toàn trên Supabase Storage, hiện ảnh trên màn hình nhắc, và tuỳ chọn xoay 360 độ. Dùng khi làm màn thêm thuốc, màn nhắc thuốc, ảnh toa thuốc, hoặc tính năng xoay viên thuốc.
---

# Skill: Ảnh viên thuốc

## Mục tiêu
- Thêm thuốc: chụp ảnh hoặc chọn từ thư viện.
- Tới giờ uống: màn hình nhắc hiện **ảnh viên thuốc to** để dễ nhận.
- (Tuỳ chọn) vuốt để xoay viên thuốc 360 độ.

## Chụp / chọn ảnh
- `expo-image-picker`: `launchCameraAsync` và `launchImageLibraryAsync`. Xin quyền camera / thư viện
  đúng lúc cần, kèm một dòng giải thích bằng tiếng Việt.
- Màn chụp có **khung hướng dẫn** ("đặt viên thuốc vào giữa, nền trơn, đủ sáng").
- Cho phép **cắt ảnh** (crop) vuông để viên thuốc nằm giữa. Cắt vuông, bo tròn khi hiển thị.

## Nén và làm sạch ảnh trước khi lưu
Dùng `expo-image-manipulator`:
- Thu nhỏ cạnh dài tối đa ~1200px (ảnh thuốc) / ~1600px (ảnh toa cần đọc chữ), JPEG chất lượng ~0.8.
- Ảnh sau khi manipulate không còn kèm dữ liệu vị trí (EXIF GPS). Chắc chắn **không lưu toạ độ**.
- Tạo thêm bản thumbnail ~300px để danh sách tải nhanh.

## Lưu trữ (bảo mật)
- Upload lên bucket **riêng tư** `user-photos`, đường dẫn `user-photos/{user_id}/medications/{id}.jpg`
  (policy ở `supabase/migrations/0002_family_prescriptions.sql` chỉ cho chủ truy cập).
- Lưu **đường dẫn** vào cột `medications.photo_path`, không lưu URL công khai.
- Hiển thị bằng **signed URL** ngắn hạn (`createSignedUrl`, ví dụ 1 giờ), cache bằng `expo-image`.
- Cache ảnh về máy (thư mục cache của app) để **màn hình nhắc hiện ảnh được cả khi mất mạng**.
  Nhắc thuốc không được phụ thuộc mạng.
- Khi xoá thuốc: xoá luôn file ảnh trong Storage.

## Hiện ảnh lúc nhắc
- Thông báo trên Android: **đừng hứa chắc là hiện được ảnh trong thông báo**. Cách hiển thị ảnh
  trong thông báo khác nhau theo hệ điều hành và thư viện. Hãy kiểm tra thực tế trên máy;
  nếu không làm được thì dùng cách dưới.
- Cách chắc chắn: thông báo có chữ ("Đến giờ uống: Paracetamol 500mg"), bấm vào mở **màn hình nhắc
  toàn màn hình** có ảnh viên thuốc lớn + nút "Đã uống" / "Nhắc lại sau 15 phút".
  Trong `data` của thông báo có `medicationId` để mở đúng màn.

## Xoay 360 độ (tuỳ chọn, làm sau cùng)
Hỏi chủ dự án trước khi làm. Thứ tự từ dễ tới khó:
1. **Không làm** (chỉ ảnh phẳng, bo tròn, xoá nền nếu có). Phương án mặc định.
2. **Chuỗi ảnh xoay** (khuyên dùng nếu muốn): hướng dẫn chụp 8-12 ảnh quanh viên thuốc (xoay viên
   thuốc hoặc xoay điện thoại). Khi xem, kéo ngón tay thì chuyển ảnh theo góc (như xem sản phẩm 360 độ
   trên web bán hàng). Nhẹ, ổn định, không cần 3D thật. Lưu mảng đường dẫn vào `medications.photo_frames`.
3. **3D thật** (quét ra mô hình): cần thư viện nặng hoặc xử lý trên server. Không khuyên dùng cho
   app cá nhân. Chỉ làm nếu chủ dự án yêu cầu rõ và chấp nhận rủi ro/độ phức tạp.

## Xoá nền (tuỳ chọn)
- Cắt vuông và nền trơn thường đã đủ đẹp. Xoá nền tự động cần thư viện/ML riêng và thường phải dùng
  development build. Kiểm tra thư viện còn bảo trì, hỏi chủ dự án trước khi thêm.

## Ảnh toa thuốc
Dùng cùng quy trình, lưu `user-photos/{user_id}/prescriptions/{id}.jpg`, cột `prescriptions.photo_path`.

## Kiểm tra trước khi báo xong
1. Chụp được, chọn được, huỷ giữa chừng không crash.
2. Ảnh sau nén nhẹ (thường < 300KB) mà viên thuốc vẫn rõ.
3. Tắt mạng: màn nhắc vẫn hiện ảnh (đã cache).
4. Tài khoản khác không xem được ảnh (thử đường dẫn trực tiếp phải bị từ chối).
5. Xoá thuốc thì ảnh trong Storage cũng mất.
