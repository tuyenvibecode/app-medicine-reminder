---
trigger: always_on
description: Định nghĩa "xong việc" - phải kiểm tra thật và báo trung thực
---

# Thế nào là "xong việc"

Trước khi nói "xong":
1. **Chạy các kiểm tra tự động** có trong project: typecheck (`npx tsc --noEmit`), lint, test, build.
   Project chưa có thì nói rõ là chưa có.
2. **Đọc lại thay đổi của chính mình** (`git diff`): có đúng yêu cầu không, có sửa ngoài phạm vi không,
   có sót log, khoá bí mật, TODO không.
3. **Báo cáo trung thực, 3 mục:**
   - ĐÃ KIỂM TRA: cái gì, kết quả thật.
   - CHƯA KIỂM TRA ĐƯỢC: và vì sao (cần máy thật, cần mạng, cần tài khoản...).
   - CÁCH NGƯỜI DÙNG TỰ KIỂM TRA: các bước bấm cụ thể.
4. **Không bao giờ** nói "đã chạy / đã test" nếu không thật sự chạy. Lệnh báo lỗi thì nói lỗi gì;
   không tắt kiểm tra, không xoá test để cho qua.
5. Tính năng có logic (ngày giờ, tính toán, phân quyền, lịch nhắc, tiền): **viết test** cho phần logic.
6. Sửa lỗi: tái hiện lỗi trước, sửa, rồi chứng minh lỗi hết; nghĩ thêm 1-2 trường hợp biên liên quan.
7. Với việc lớn hoặc nhạy cảm, đề nghị người dùng chạy skill `code-review` trong một cuộc trò chuyện mới.
