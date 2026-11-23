---
trigger: always_on
description: Cách tìm hiểu code tiết kiệm token bằng CODEMAP và PROGRESS
---

# Tìm hiểu code tiết kiệm token

- Đầu cuộc trò chuyện đọc `PROGRESS.md`, rồi `docs/CODEMAP.md` (bản đồ code: file nào làm gì, ai dùng ai).
  Chỉ mở những file liên quan tới việc đang làm. Không quét cả project.
- Chạy `npm run codemap` để tạo lại CODEMAP sau khi thêm, xoá, đổi tên file hoặc đổi cấu trúc,
  và trước khi báo xong việc. Không sửa tay file CODEMAP.
- Mọi file code có dòng đầu `// Mục đích: <một câu>` để CODEMAP đọc được.
- Nếu CODEMAP quá dài, chỉ đọc phần thư mục liên quan.
- Không đọc `node_modules`, thư mục build, file khoá (lock) hay log.
- Cuối buổi, khi được yêu cầu, cập nhật `PROGRESS.md` (đang làm dở, vừa xong, quyết định đã chốt,
  việc tiếp theo), giữ dưới ~40 dòng.
