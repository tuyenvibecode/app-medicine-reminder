---
name: code-review
description: Review độc lập các thay đổi code (git diff) để bắt lỗi logic, lỗ hổng bảo mật, code khó bảo trì và thay đổi ngoài phạm vi. Dùng sau khi làm xong một tính năng hoặc khi người dùng gõ /code-review. Nên chạy trong một cuộc trò chuyện MỚI.
---

# Skill: Review code độc lập

Vì sao cần: AI tự chấm bài mình thường bỏ sót lỗi mình vừa tạo ra. Một lượt review với "mắt mới"
(chat mới, không biết lịch sử, tốt nhất dùng model mạnh hơn) bắt được nhiều lỗi hơn.
Bạn là **người review**, không phải người viết: nhiệm vụ là tìm lỗi, không phải bảo vệ code.
**Chỉ báo cáo, không tự sửa** (trừ khi người dùng bảo sửa).

## Bước 1 - Lấy phạm vi
`git diff` (chưa commit), hoặc `git diff HEAD~1` (commit gần nhất), hoặc theo chỉ định của người dùng.
Đọc `PROGRESS.md` để biết ý định. Chỉ mở thêm file khi cần hiểu ngữ cảnh.

## Bước 2 - Soát theo thứ tự ưu tiên
1. **Bảo mật** (xem trước tiên):
   khoá/mật khẩu/token lộ trong code hoặc log; thiếu kiểm tra phân quyền ở server/database (RLS, `using (true)`);
   dữ liệu từ người dùng không được kiểm tra; nối chuỗi vào câu truy vấn; dữ liệu nhạy cảm bị log hoặc chia sẻ
   công khai; thư viện hoặc công cụ mới thêm mà chưa được duyệt.
2. **Đúng đắn:** code có làm đúng yêu cầu không; điều kiện sai, lệch 1, quên `await`, thiếu xử lý lỗi,
   trường hợp biên (rỗng, null, mất mạng, bấm hai lần, ngày giờ, múi giờ).
3. **Phạm vi:** có sửa ngoài yêu cầu, xoá nhầm code, đổi hành vi chỗ khác không.
4. **Dễ bảo trì:** hàm/file quá dài, lặp code, tên khó hiểu, tách lớp sai, `any`, code chết, `console.log` sót,
   thiếu dòng `// Mục đích:`.
5. **Kiểm thử:** logic quan trọng đã có test chưa; test có thật sự kiểm tra điều cần kiểm tra không.

## Bước 3 - Báo cáo
Chia theo mức độ, mỗi mục ghi: **file:dòng, vấn đề, vì sao nguy hiểm, gợi ý sửa**.
- 🔴 Phải sửa ngay (bảo mật, mất dữ liệu, sai logic nghiêm trọng)
- 🟠 Nên sửa (lỗi trường hợp biên, khó bảo trì)
- 🟡 Gợi ý (cải thiện nhỏ)
Cuối cùng: kết luận ngắn "an toàn để dùng chưa" và phần nào bạn **không** xem được.
Không bịa lỗi để cho đủ danh sách. Nếu không thấy vấn đề, nói thẳng là không thấy và đã xem những gì.
