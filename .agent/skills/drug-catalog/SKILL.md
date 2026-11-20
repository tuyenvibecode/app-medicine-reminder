---
name: drug-catalog
description: Xây danh mục thuốc của gia đình do dược sĩ nhập và duyệt - nhập tay, nhập từ Excel/CSV, hoặc chụp hộp thuốc để AI đọc chữ tự điền form. Dùng khi làm màn danh mục thuốc, import dữ liệu thuốc, hoặc đọc ảnh hộp thuốc / toa thuốc.
---

# Skill: Danh mục thuốc của gia đình

Đọc rule `04-medical-safety.md` trước. Điểm chính: **AI chỉ đọc chữ, không tự gợi ý thuốc**;
dược sĩ phải xác nhận; **không cào dữ liệu từ website nhà thuốc**.

## Vì sao tự xây danh mục
Ở Việt Nam chưa có API thuốc chuẩn mở cho cá nhân. Cổng của Cục Quản lý Dược cho tra cứu trên web
nhưng không có API công khai. Nên danh mục nhỏ (vài chục đến vài trăm thuốc hay dùng) do dược sĩ
trong nhà quản lý, nguồn là **hộp thuốc và tờ hướng dẫn chính thức**.

## Dữ liệu một thuốc (bảng `drug_catalog`)
Tên thương mại, hoạt chất, hàm lượng, dạng bào chế, số đăng ký (VD-/VN-), liều thường dùng,
chống chỉ định, ghi chú, ảnh hộp, `is_prescription_only`, `verified_by`, `verified_at`.
Thuốc chưa có `verified_at` hiện nhãn "Chưa xác nhận" và **không được chọn** vào gợi ý từ xa.

## Ba cách nhập
**A. Nhập tay (luôn có)**: form ngắn, ô nào không biết để trống.

**B. Nhập từ Excel/CSV**: hiệu thuốc thường có phần mềm quản lý bán hàng xuất được danh mục.
- Màn "Nhập từ file": chọn file (`expo-document-picker`) -> xem trước 10 dòng -> ghép cột
  (cột nào là tên, hoạt chất, hàm lượng...) -> báo dòng lỗi -> nhập.
- Parse trên máy (CSV bằng thư viện parse nhẹ). Chống trùng theo (tên + hàm lượng + số đăng ký).
- Thuốc nhập từ file mặc định **chưa xác nhận**; dược sĩ duyệt từng cái hoặc duyệt hàng loạt.

**C. Chụp hộp thuốc / tờ hướng dẫn, AI đọc chữ**
1. Chụp ảnh (theo skill `medicine-photos`).
2. Gửi ảnh tới một **Supabase Edge Function** `read-drug-label`. Khoá API của dịch vụ AI nằm trong
   **secrets của Edge Function**, tuyệt đối không để trong app.
3. Function yêu cầu AI **chỉ trích xuất chữ đang có trên ảnh** thành các trường (tên, hoạt chất,
   hàm lượng, dạng bào chế, số đăng ký, nhà sản xuất). Không bổ sung kiến thức ngoài ảnh.
   Trường nào không thấy trên ảnh thì trả `null`.
4. App điền sẵn vào form, **hiện ảnh bên cạnh để dược sĩ đối chiếu**, sửa và bấm "Xác nhận".
5. Function: kiểm tra JWT của người gọi, giới hạn kích thước ảnh, giới hạn số lần gọi mỗi ngày,
   không ghi log nội dung ảnh.
Gói AI có thể tốn phí theo lượt: báo chủ dự án chi phí ước tính trước khi bật.

## Màn hình
- Danh sách có tìm kiếm (theo tên / hoạt chất), badge "Đã xác nhận" / "Chưa xác nhận" / "Kê đơn".
- Chỉ **dược sĩ** thấy nút thêm / sửa / xoá. Thành viên khác chỉ xem.
- Chi tiết thuốc: ảnh hộp, thông tin, ai xác nhận và khi nào.

## Kiểm tra trước khi báo xong
1. Tài khoản "patient" không sửa được danh mục (thử trực tiếp bằng truy vấn, không chỉ ẩn nút).
2. Thuốc kê đơn không chọn được trong gợi ý (trigger ở database phải chặn).
3. Import file lỗi / thiếu cột không làm hỏng danh mục, có báo lỗi dễ hiểu.
4. Không có khoá bí mật nào trong code app (`npx expo export` rồi tìm chuỗi khoá).
