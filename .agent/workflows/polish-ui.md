---
description: Làm UI đẹp và mượt hơn - so với thiết kế Stitch, thêm hiệu ứng, giữ nguyên logic
---

# /polish-ui - Trau chuốt giao diện

Dùng khi giao diện đã chạy nhưng chưa đẹp / chưa mượt như thiết kế. **Giữ nguyên logic, dữ liệu,
Supabase, thông báo nhắc thuốc. Chỉ sửa giao diện và hiệu ứng.** Đọc rule `03-ui-design.md`.

1. **So sánh (chưa sửa code)**: mở từng ảnh trong `design/stitch/`, đối chiếu màn hình tương ứng trong app.
   Lập bảng khác biệt (màu, font, cỡ chữ, khoảng cách, bo góc, đổ bóng, icon, bố cục).
   Gửi bảng cho chủ dự án trước khi sửa. Nếu chủ dự án gửi ảnh chụp app thật kèm ảnh Stitch, ưu tiên
   các chỗ họ chỉ ra.

2. **Nền tảng**: trích lại chính xác design tokens từ Stitch (không ước chừng). Load đúng font bằng
   `expo-font` (không có thì chọn font gần nhất và báo). Đổ bóng: Android dùng elevation,
   iOS dùng shadow. Làm lại component dùng chung trước, rồi mới tới từng màn.

3. **Làm cho mượt** (`react-native-reanimated`):
   - nhấn nút nhún nhẹ; chuyển cảnh mượt; danh sách hiện fade/slide
   - "Đã uống": hiệu ứng xác nhận rõ ràng
   - skeleton khi đang tải thay vì màn trắng
   - `expo-haptics` rung nhẹ cho hành động quan trọng
   - 150-300ms, tự nhiên, tôn trọng "giảm chuyển động"; danh sách dài dùng `FlatList`

4. **Tự do có kiểm soát**: nếu thấy chỗ khác thiết kế mà đẹp và mượt hơn, được tự quyết nhưng giữ đúng
   tinh thần và màu chủ đạo của Stitch; ghi vào `design/DESIGN_NOTES.md` kèm lý do.

5. **Quy tắc**: làm từng màn một, bắt đầu bằng "Hôm nay"; xong màn nào báo màn đó.
   Giữ chữ >= 16sp, vùng bấm >= 48dp, đủ 3 trạng thái. Chạy `npx tsc --noEmit` và `npm run lint`.
