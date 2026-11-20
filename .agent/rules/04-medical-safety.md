---
trigger: always_on
description: Quy tắc an toàn y tế - AI không tự gợi ý thuốc, dược sĩ là người duyệt, gợi ý chỉ trong gia đình
---

# An toàn y tế (bắt buộc)

App liên quan đến thuốc. Sai thông tin có thể gây hại cho người. Các điều sau **không được nới lỏng**
nếu chưa hỏi chủ dự án.

## 1. AI không đưa ra lời khuyên y tế
- **Không** dùng AI để tự gợi ý thuốc, liều dùng, thuốc thay thế, hay cảnh báo tương tác.
- AI chỉ được dùng để **đọc chữ từ ảnh** (hộp thuốc, tờ hướng dẫn, toa thuốc) và **tự điền form**.
  Người dùng (hoặc dược sĩ) **phải xem và xác nhận** trước khi lưu.
- Không dùng dữ liệu thuốc nước ngoài để cảnh báo tương tác (tên thuốc không khớp thuốc Việt Nam).

## 2. Nguồn dữ liệu thuốc
- Danh mục thuốc do **dược sĩ trong gia đình** nhập và duyệt. Nguồn tham chiếu: hộp thuốc, tờ hướng dẫn
  sử dụng chính thức, thông tin số đăng ký lưu hành của Cục Quản lý Dược.
- **Không** cào (scrape) nội dung từ website nhà thuốc hay trang thương mại để nạp dữ liệu
  (có thể vướng bản quyền và điều khoản sử dụng).
- Mỗi thuốc trong danh mục lưu `verified_by` và `verified_at`. Thuốc chưa duyệt hiện nhãn "Chưa xác nhận".

## 3. "Gợi ý thuốc", không phải "đơn thuốc"
- Tính năng của dược sĩ gia đình gọi là **"Gợi ý thuốc từ dược sĩ trong gia đình"**.
  Đó là lời dặn trong gia đình, **không phải đơn thuốc có giá trị pháp lý**.
- Ở Việt Nam người kê đơn thuốc là bác sĩ; quy định kê/bán thuốc online vẫn đang được hoàn thiện.
  Chủ dự án và dược sĩ tự chịu trách nhiệm xác nhận quy định.
- Chỉ dùng cho **thuốc không kê đơn**. Có cờ `is_prescription_only` trên thuốc; thuốc kê đơn
  (đặc biệt kháng sinh, thuốc gây nghiện, hướng thần) **không được đưa vào luồng gợi ý từ xa**.
- Mọi màn hình gợi ý hiện dòng cố định: "Chỉ mang tính hỗ trợ trong gia đình. Nếu triệu chứng nặng
  hoặc kéo dài, hãy đi khám."

## 4. Thông tin an toàn cho người bệnh
- Hồ sơ người bệnh có mục **dị ứng thuốc / thai kỳ / bệnh nền** (nhập tay, tuỳ chọn) để dược sĩ
  xem khi gợi ý. App chỉ hiển thị cho dược sĩ, không tự suy luận gì từ đó.
- Triệu chứng nguy hiểm (khó thở, đau ngực, sốt cao kéo dài, trẻ nhỏ...): màn gửi triệu chứng
  hiện cảnh báo "Hãy đi khám / gọi cấp cứu" thay vì chỉ gửi yêu cầu.

## 5. Khi nghi ngờ
Dừng lại, giải thích rủi ro bằng lời thường và hỏi chủ dự án. Không tự quyết trong các việc
liên quan tới liều dùng, thuốc kê đơn, hay nội dung y tế.
