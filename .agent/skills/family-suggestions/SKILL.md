---
name: family-suggestions
description: Tính năng "Gợi ý thuốc từ dược sĩ trong gia đình" - tạo gia đình bằng mã mời, người bệnh gửi triệu chứng, dược sĩ chọn thuốc từ danh mục và gửi gợi ý, người bệnh thêm vào lịch nhắc. Dùng khi làm gia đình, mời thành viên, gửi triệu chứng, gợi ý thuốc, thông báo giữa các máy.
---

# Skill: Gợi ý thuốc từ dược sĩ trong gia đình

Đọc rule `04-medical-safety.md` và skill `drug-catalog` trước. Schema ở
`supabase/migrations/0002_family_prescriptions.sql` (đã có RLS và các trigger an toàn).

## Khái niệm
- **Household (gia đình)**: nhóm người dùng chung. Mỗi người có vai trò `patient` hoặc `pharmacist`.
- Người tạo gia đình (chủ dự án) tạo **mã mời** (dùng 1 lần, hết hạn 24 giờ) cho vợ (vai trò dược sĩ)
  và người nhà khác. Người được mời nhập mã để vào gia đình.
- Tài khoản do chủ dự án tạo sẵn trong Supabase Dashboard (đăng ký công khai đã tắt).
  Không làm chức năng "tự đăng ký".
- Mã mời gọi qua RPC `create_invite` và `join_household`, không truy vấn trực tiếp bảng mời.

## Luồng
1. **Người bệnh** mở "Hỏi dược sĩ": chọn dược sĩ trong gia đình, nhập triệu chứng (chữ + ảnh tuỳ chọn).
   Trước khi gửi hiện cảnh báo triệu chứng nguy hiểm (xem rule 04). Ghi `suggestions.status = 'requested'`.
2. **Dược sĩ** thấy danh sách yêu cầu (kèm dị ứng / bệnh nền của người đó nếu họ đã nhập),
   chọn thuốc **từ danh mục đã xác nhận**, ghi liều, số lần/ngày, số ngày, lưu ý, bấm "Gửi gợi ý"
   (`status = 'suggested'`, `suggestion_items` đã được ghi).
3. **Người bệnh** nhận thẻ gợi ý, đọc, bấm **"Thêm tất cả vào lịch nhắc"**: tạo `medications` +
   `schedules` từ các `suggestion_items`, chạy `rescheduleAll` (skill `medication-reminders`),
   đặt `status = 'accepted'`. Hoặc "Không dùng" (`declined`). Cũng có nút "Lưu vào Đơn thuốc".
4. Mỗi gợi ý hiện dòng cố định: "Chỉ mang tính hỗ trợ trong gia đình" (rule 04).

## Thông báo giữa các máy
- **Bản đầu (đơn giản, khuyên làm trước)**: dùng Supabase **Realtime** khi app đang mở và làm mới
  khi mở app, kèm huy hiệu "có yêu cầu mới" trong app.
- **Bản sau (nếu cần nhắc khi app đóng)**: push từ server. Dùng Expo Push Service, lưu push token
  của mỗi máy (bảng riêng, RLS own-only), một Database Webhook gọi Edge Function để gửi.
  Khoá và logic gửi nằm ở server. Hỏi chủ dự án trước khi làm vì tăng độ phức tạp.
- Lưu ý: project Supabase gói Free tự pause sau 1 tuần không có hoạt động. Dùng thường xuyên trong
  gia đình thì ít gặp, nhưng nếu bị pause thì tính năng này tạm ngừng còn nhắc thuốc local vẫn chạy.

## Quyền riêng tư
- Dữ liệu sức khoẻ của mỗi người là của người đó. Dược sĩ chỉ xem yêu cầu **gửi cho mình** và hồ sơ
  dị ứng của người **cùng gia đình** (RLS đã giới hạn).
- Ảnh triệu chứng ở bucket `symptom-photos` riêng tư, dùng signed URL ngắn hạn.
- Không gửi nội dung triệu chứng vào dịch vụ AI. Chỉ đọc chữ trên ảnh hộp thuốc (skill `drug-catalog`).
- Thành viên rời gia đình thì mất quyền xem. Làm màn "Quản lý thành viên" (chủ gia đình có thể xoá thành viên).

## Màn hình cần làm
Gia đình (thành viên, tạo mã mời, nhập mã) · Hỏi dược sĩ (bệnh nhân) · Hộp thư yêu cầu (dược sĩ) ·
Soạn gợi ý (dược sĩ) · Thẻ gợi ý nhận được (bệnh nhân). Dùng bố cục theo `design/stitch/`.

## Kiểm tra trước khi báo xong (kiểm thử bằng 2-3 tài khoản)
1. Tài khoản ngoài gia đình không thấy gì của gia đình.
2. Bệnh nhân A không thấy yêu cầu của bệnh nhân B (kể cả khi truy vấn trực tiếp).
3. Bệnh nhân không tự đổi `status` thành `suggested`, không sửa nội dung `suggestion_items`.
4. Thuốc kê đơn không đưa vào gợi ý được (database từ chối).
5. Mã mời dùng lần 2 hoặc quá 24 giờ bị từ chối.
6. "Thêm tất cả vào lịch nhắc" tạo đúng thuốc, lịch, thông báo local; không bị tạo trùng nếu bấm 2 lần.
