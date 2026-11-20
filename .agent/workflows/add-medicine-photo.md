---
description: Làm tính năng ảnh viên thuốc (chụp/chọn, nén, lưu riêng tư, hiện ở màn nhắc, xoay 360 tuỳ chọn)
---

# /add-medicine-photo - Ảnh viên thuốc

Đọc skill `medicine-photos` và `supabase-secure-backend` trước.

1. **Database**: kiểm tra `medications.photo_path` (và `photo_frames` nếu làm xoay) đã có từ migration 0002;
   bucket `user-photos` riêng tư với policy theo thư mục `{user_id}`.
2. **Chụp / chọn ảnh** trong màn Thêm thuốc: khung hướng dẫn, cắt vuông, xin quyền đúng lúc.
3. **Nén + upload**: thu nhỏ, JPEG, tạo thumbnail, upload, lưu đường dẫn (không lưu URL công khai).
4. **Hiển thị**: signed URL + cache `expo-image`; cache file về máy để dùng khi mất mạng.
5. **Màn hình nhắc**: mở từ thông báo (`medicationId` trong data), ảnh to, nút "Đã uống" / "Nhắc lại".
   Kiểm tra thực tế xem có đưa được ảnh vào chính thông báo không; nếu không thì giữ cách này.
6. **Xoay 360 (tuỳ chọn)**: hỏi chủ dự án có làm không. Nếu làm thì dùng chuỗi ảnh, không làm 3D thật.
7. **Kiểm tra**: chạy checklist cuối skill `medicine-photos`. Báo cáo theo mẫu ở `02-code-style.md`.
