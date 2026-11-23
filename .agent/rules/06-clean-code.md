---
trigger: model_decision
description: Đọc khi viết mới, sửa, thêm tính năng hoặc dọn code - quy tắc code sạch và dễ bảo trì (đặt tên, kích thước file và hàm, tách lớp, xử lý lỗi, không lặp code, kiểu dữ liệu)
---

# Code sạch, dễ bảo trì

Viết code để **người đọc sau 6 tháng** (chính chủ dự án, không phải dev chuyên nghiệp) vẫn hiểu được.

## Cấu trúc
- Một file, một hàm: làm **một việc**. Hàm dưới ~40 dòng, file dưới ~300 dòng; vượt thì tách.
- Tách 3 lớp: **giao diện** (hiển thị) / **logic** (xử lý, tính toán) / **dữ liệu** (gọi API, database).
  Màn hình không gọi thẳng database; đi qua một hàm ở lớp dữ liệu.
- Logic thuần (giờ giấc, tính toán, kiểm tra điều kiện) tách thành hàm thuần dễ kiểm thử.
- Đầu mỗi file có dòng `// Mục đích: <một câu>`.

## Đặt tên và viết
- Tên rõ nghĩa, tiếng Anh, không viết tắt khó hiểu. Biến đúng/sai bắt đầu bằng `is`, `has`, `can`.
- Không dùng "số ma thuật" hoặc chuỗi lặp lại: đặt thành hằng số có tên.
- Không lặp code. Lặp lần thứ ba thì mới tách chung; đừng trừu tượng hoá quá sớm.
- Không để code chết, code bị comment-out, `console.log` debug, TODO không rõ ràng.
- TypeScript chặt: không dùng `any` (nếu bắt buộc, ghi lý do). Dữ liệu từ ngoài vào kiểm tra bằng schema (ví dụ zod).

## Xử lý lỗi
- Không nuốt lỗi (`catch` rỗng). Lỗi phải được ghi nhận hoặc báo người dùng bằng câu dễ hiểu.
- Xử lý các trường hợp biên: danh sách rỗng, giá trị rỗng/null, mất mạng, bấm hai lần, dữ liệu sai.

## Phạm vi thay đổi
- Chỉ sửa đúng việc được giao. Không tự refactor, đổi style hay đổi tên hàng loạt ngoài yêu cầu;
  nếu thấy cần, **đề xuất riêng** thay vì làm lẫn vào.
- Theo mẫu có sẵn trong project. Nhất quán quan trọng hơn "hay hơn".
- Comment tiếng Việt, giải thích **vì sao**, không lặp lại điều code đã nói.
