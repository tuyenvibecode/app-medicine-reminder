---
description: Dựng lại UI của app theo thiết kế Stitch mới, dùng React Native Reusables + NativeWind, giữ nguyên logic
---

# /redesign-ui - Làm lại giao diện theo thiết kế mới

Dùng khi đã export thiết kế mới từ Stitch (.zip + Project Brief) vào `design/stitch/`.
Đọc rules `03-ui-design.md` và `00-project-overview.md` trước. **Giữ nguyên logic, dữ liệu,
Supabase, thông báo nhắc thuốc. Chỉ làm lại giao diện.**

1. **Kiểm kê thiết kế**: liệt kê mọi màn hình tìm thấy trong `design/stitch/` (tên + ảnh).
   Đối chiếu với danh sách màn hình trong `design/UI-PROMPT.md`. Báo màn nào thiếu.
   **Dừng, chờ chủ dự án xác nhận danh sách.**

2. **Nền tảng UI**
   - Cài NativeWind + React Native Reusables theo tài liệu chính thức (reactnativereusables.com/docs).
   - Trích design tokens từ Stitch (màu light + dark, font, bo góc, spacing, đổ bóng) vào biến theme.
   - **Dừng, cho chủ dự án xem bảng màu + font và xác nhận.**

3. **Thư viện component** (`src/components/ui/`): Button, Card, Input, Badge, Tabs, Dialog, Switch,
   Progress, Skeleton... thêm từ Reusables, chỉnh theo token. Làm thêm component riêng của app:
   `PillImage` (ảnh viên thuốc bo tròn), `DoseCard`, `StatusBadge` (icon + chữ), `EmptyState`.

4. **Dựng từng màn hình**, theo thứ tự: Hôm nay -> Màn nhắc thuốc -> Danh sách thuốc -> Thêm thuốc ->
   Đơn thuốc + Chi tiết -> Lịch sử -> Cài đặt -> (Gợi ý thuốc, Danh mục thuốc nếu đã có tính năng).
   Mỗi màn: ảnh Stitch làm chuẩn, đủ trạng thái đang tải / lỗi / rỗng, dark mode.
   **Xong mỗi màn báo chủ dự án xem rồi làm tiếp.**

5. **So sánh**: chụp màn hình app thật và đặt cạnh ảnh Stitch, liệt kê chỗ còn lệch
   (màu, khoảng cách, cỡ chữ, bóng). Sửa tới khi chủ dự án hài lòng.

6. **Ghi lại** quyết định khác thiết kế gốc vào `design/DESIGN_NOTES.md`.
   Chạy `npx tsc --noEmit` và `npm run lint`. Báo cáo theo mẫu ở `02-code-style.md`.
