# PROGRESS - Ghi chú tiến độ app nhắc uống thuốc

> Agent đọc file này đầu mỗi cuộc trò chuyện. Cuối mỗi buổi code, nhờ agent cập nhật.
> Giữ ngắn (dưới ~40 dòng). Mục nào cũ thì xoá bớt.

## Đang làm dở
- (không có)

## Vừa xong gần đây (24/11/2026)
- Dọn sạch toàn bộ dữ liệu ảo khởi tạo (tủ thuốc, lịch uống, lịch sử, tài khoản, thành viên) và tự lọc ID mẫu cũ lưu trong SecureStore.
- Xây tính năng **Quản lý Sức khoẻ** (`app/health/index.tsx`, `src/features/health/`):
  - Tab **Đo máy Omron**: đọc ảnh 3 số `SYS / DIA / PULSE`, đánh giá chuẩn Bộ Y tế (QĐ 3192/BYT + ngưỡng đo tại nhà VNHA ≥ 135/85) và chú thích tiếng Việt dễ hiểu cho người lớn tuổi.
  - Tab **Hồ sơ đi khám**: chụp nhiều ảnh giấy khám + đơn thuốc, đánh giá đường huyết (QĐ 5481/BYT), so sánh chỉ số & đối chiếu thuốc thay đổi để xác nhận cập nhật lịch nhắc.
- Nâng cấp & deploy Edge Function `ocr-prescription` (hỗ trợ `mode: 'omron' | 'visit'`, key `AQ.` miễn phí của Google AI Studio qua header `x-goog-api-key`, tự nhảy 6 model dự phòng) — đã test đọc ảnh máy Omron thành công trên máy thật.
- Sửa lỗi crash NativeWind v4 (`LinkingContext`) ở màn Đăng nhập/`Button` và lỗi sang ngày mới bị dính trạng thái "Đã uống" từ hôm qua trong `AppContext`.

## Quyết định đã chốt
- Database: Supabase, project riêng cho app thuốc. Đăng ký công khai đã tắt.
- UI: React Native Reusables + NativeWind, chữ to dễ bấm cho người lớn tuổi.
- Nhắc thuốc: thông báo local, không phụ thuộc server.
- AI OCR: chỉ gọi qua Supabase Edge Function (`GEMINI_API_KEY` lưu ở Secrets), không tự bịa thuốc/chỉ số khi offline.
- Gợi ý thuốc từ dược sĩ gia đình: không phải đơn thuốc, không kê thuốc kê đơn từ xa.
- Lộ trình dùng thật: dự kiến bắt đầu dùng chính thức từ 11/12 (nhập liệu trình 2 tháng còn lại).

## Việc tiếp theo
1. Test thực tế tab **Hồ sơ đi khám** (chụp nhiều ảnh đơn thuốc + đối chiếu thay đổi thuốc) và kiểm tra báo thức đúng giờ trên máy Android thật.
2. Trước ngày 11/12: chạy `npm audit`, rà soát bảo mật & build APK bản release cài dùng chính thức.
3. (Tuỳ chọn) Khởi tạo Git cho dự án để lưu lịch sử thay đổi từng buổi code.

## Cách nhờ agent cập nhật (gõ cuối buổi)
"Cập nhật PROGRESS.md: hôm nay làm gì, dở chỗ nào, việc tiếp theo."
