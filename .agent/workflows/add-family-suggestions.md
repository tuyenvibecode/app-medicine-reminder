---
description: Làm tính năng "Gợi ý thuốc từ dược sĩ trong gia đình" (gia đình, danh mục, yêu cầu, gợi ý)
---

# /add-family-suggestions - Gợi ý thuốc từ dược sĩ gia đình

Đọc trước: rule `04-medical-safety.md`, skills `family-suggestions`, `drug-catalog`,
`supabase-secure-backend`. Làm theo từng giai đoạn, **mỗi giai đoạn xong dừng cho chủ dự án thử**.

## Giai đoạn 0 - Chốt với chủ dự án (hỏi trước khi code)
- Vợ dùng loại thuốc nào (chỉ thuốc không kê đơn, hay có cả thuốc kê đơn)? Nếu có thuốc kê đơn: nhắc lại
  rule 04, không đưa vào luồng gợi ý từ xa.
- Nạp danh mục thuốc bằng cách nào (nhập tay / file Excel từ phần mềm hiệu thuốc / chụp hộp thuốc)?
- Chấp nhận bản đầu chỉ cập nhật khi app đang mở (Realtime), hay cần push khi app đóng?

## Giai đoạn 1 - Database
- Đưa `supabase/migrations/0002_family_prescriptions.sql` cho chủ dự án chạy trong SQL Editor.
- Chạy "Security Advisor" của Supabase và báo kết quả.
- Hướng dẫn tạo tài khoản cho vợ và người nhà trong Dashboard (Authentication -> Users -> Add user).

## Giai đoạn 2 - Gia đình
- Màn: tạo gia đình, tạo mã mời (chọn vai trò), nhập mã, danh sách thành viên.
- Gọi qua RPC `create_household`, `create_invite`, `join_household`.
- Kiểm thử bằng 2 tài khoản (xem checklist trong skill).

## Giai đoạn 3 - Danh mục thuốc
- Làm theo skill `drug-catalog`: nhập tay trước, rồi nhập từ file, cuối cùng là chụp hộp thuốc đọc bằng AI
  qua Edge Function (hỏi chủ dự án về chi phí và khoá API trước).

## Giai đoạn 4 - Luồng gợi ý
- Màn Hỏi dược sĩ, Hộp thư yêu cầu, Soạn gợi ý, Thẻ gợi ý, "Thêm tất cả vào lịch nhắc".
- Bám bố cục `design/stitch/`. Dòng cảnh báo cố định theo rule 04.

## Giai đoạn 5 - Rà soát
- Chạy `/security-audit`, chạy checklist kiểm thử của skill `family-suggestions`.
- Ghi `CHANGELOG.md`. Báo cáo theo mẫu ở `02-code-style.md`.
