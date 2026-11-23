---
name: verify-work
description: Kiểm tra kỹ một thay đổi code trước khi báo xong - chạy typecheck, lint, test, build, soát trường hợp biên và báo cáo trung thực những gì đã và chưa kiểm tra. Dùng khi vừa làm xong tính năng, sửa lỗi, hoặc khi người dùng gõ /verify-work.
---

# Skill: Kiểm tra trước khi báo xong

Mục tiêu: bắt lỗi **trước** khi người dùng gặp. Typecheck qua chưa có nghĩa là đúng, nên kiểm tra nhiều lớp.

## Bước 1 - Biết mình đã đổi gì
`git status` và `git diff`. Liệt kê file đã đổi và mục đích từng thay đổi bằng 1 dòng.
Nếu có thay đổi ngoài yêu cầu, nói rõ và hỏi có giữ không.

## Bước 2 - Chạy kiểm tra tự động (chạy thật, đọc kết quả thật)
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Test: `npm test` (nếu có)
- Build: lệnh build của project, nếu thay đổi lớn
- Tạo lại bản đồ code: `npm run codemap`
Lỗi nào cũng phải sửa hoặc giải thích. Không tắt rule lint, không xoá test để cho qua.

## Bước 3 - Soát trường hợp biên (nghĩ rồi kiểm tra bằng test hoặc đọc code)
- Dữ liệu rỗng, null, rất dài, ký tự đặc biệt, tiếng Việt có dấu
- Mất mạng, lỗi từ server, phản hồi chậm, bấm hai lần liên tiếp
- Người dùng chưa đăng nhập, hết phiên, không có quyền
- Ngày giờ: nửa đêm, đổi ngày, đổi múi giờ, tháng có ít ngày
- Lần chạy đầu tiên (chưa có dữ liệu) và lần chạy thứ hai (đã có dữ liệu)

## Bước 4 - Bảo mật nhanh
- Không có khoá/mật khẩu/token trong code, log hoặc commit
- Dữ liệu vào được kiểm tra ở server/database; phân quyền không chỉ dựa vào giao diện
- Không thêm thư viện mới chưa hỏi người dùng

## Bước 5 - Với logic quan trọng, có test
Nếu thay đổi có logic (tính toán, ngày giờ, phân quyền, lịch nhắc) mà chưa có test: viết test cho nó,
gồm cả trường hợp biên ở bước 3, rồi chạy.

## Bước 6 - Báo cáo trung thực
Trả lời đúng 3 mục:
1. **Đã kiểm tra:** lệnh nào đã chạy, kết quả thật.
2. **Chưa kiểm tra được:** và vì sao (cần máy thật, cần mạng, cần tài khoản khác...).
3. **Cách bạn tự kiểm tra:** các bước bấm cụ thể, kết quả mong đợi ở từng bước.
Không viết "đã test" cho thứ chưa chạy.
