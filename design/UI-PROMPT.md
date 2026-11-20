# Prompt render UI (dán vào Google Stitch hoặc AI thiết kế)

Cách dùng: dán nguyên khối dưới đây. Nếu thiếu màn thì nói "tạo thêm màn số X" thay vì làm lại từ đầu.
Muốn kết quả sát phong cách shadcn (dễ dịch sang React Native Reusables) thì giữ nguyên dòng STYLE.
Xong thì export .zip + Project Brief từ Stitch, bỏ vào `design/stitch/`, rồi gõ `/redesign-ui`.

```
Design a mobile app UI (Android, portrait, 360x800) for a personal medication
reminder app. All visible text in the app must be in VIETNAMESE.

STYLE
- Calm, clean, trustworthy, friendly. Not clinical or cold. Easy for elderly users.
- shadcn/ui-inspired visual language: neutral palette, thin subtle borders, soft rounded
  cards (radius 16-24), generous spacing, very subtle shadows, clear typography hierarchy.
- One calm primary color (teal or soft green), a warm accent for warnings, light
  neutral background. Also provide a dark mode version.
- Large readable text (min 16sp), big touch targets (min 48dp), high contrast.
- Status never relies on color alone: use icon + text (Đã uống / Bỏ qua / Quên).
- The pill photo is the hero visual: show it large and round/rounded in cards.

SCREENS (design each as its own screen)

1. HÔM NAY (home)
   - Greeting + date, progress ring "3/5 liều hôm nay".
   - Timeline of today's doses grouped Sáng / Trưa / Chiều / Tối.
   - Each dose card: pill photo, name, dosage ("1 viên - sau ăn"), time,
     big "Đã uống" button, small "Nhắc lại sau 15 phút".
   - States: taken, upcoming, overdue.
   - Bottom nav: Hôm nay, Thuốc, Đơn thuốc, Lịch sử, Cài đặt.

2. MÀN HÌNH NHẮC THUỐC (full-screen alert when it's time)
   - Very large pill photo in the center, name, dosage, time.
   - Two big buttons: "Đã uống" and "Nhắc lại sau 15 phút", small link "Bỏ qua".
   - Works on a lock screen: minimal, high contrast.

3. DANH SÁCH THUỐC (medicine cabinet)
   - Grid or list of medicines with pill photo, name, remaining stock,
     low-stock warning badge. Search bar. "+" floating button.

4. THÊM THUỐC (add medicine, multi-step form)
   - Step 1: add pill photo - "Chụp ảnh" or "Chọn từ thư viện". Large photo area,
     a guide frame for taking the picture, option to crop so the pill looks clean.
   - Optional: a 360-degree "xoay" preview of the pill (drag to rotate, with a small
     rotation hint icon). Mark this as an optional feature.
   - Step 2: name, strength, form (viên/nước/gói), notes, color tag.
   - Step 3: schedule - times of day (add several), days of week chips,
     before/after meal, start/end date.
   - Step 4: stock count and low-stock alert threshold.
   - Progress indicator on top, "Lưu thuốc" button.

5. ĐƠN THUỐC (prescription storage)
   - List of prescriptions, each linked to a condition/illness
     ("Cảm cúm", "Huyết áp"...), date, doctor/pharmacist name, photo thumbnail.
   - Filter by condition. "+" to add (photo of prescription or pick medicines).

6. CHI TIẾT ĐƠN THUỐC
   - Prescription photo on top, condition, date, list of medicines in it
     (with pill photos, dosage, quantity).
   - A big button "Đưa cho dược sĩ" that opens a clean full-screen summary view
     (list of medicines + quantities) that a pharmacist can read quickly.

7. GỢI Ý THUỐC TỪ DƯỢC SĨ TRONG GIA ĐÌNH (remote suggestions)
   - Family member list (e.g. "Vợ - Dược sĩ"), a "Hỏi dược sĩ" button where the
     patient describes symptoms (text + optional photo). Show a warning banner for
     severe symptoms: "Nếu khó thở, đau ngực... hãy đi khám ngay".
   - Pharmacist side view: patient's symptom, allergy/notes, pick medicines from the
     family medicine list with dosage and duration, "Gửi gợi ý" button.
   - Patient receives it as a card and can add all medicines to reminders in one tap.
   - Fixed notice: "Chỉ mang tính hỗ trợ trong gia đình".

8. DANH MỤC THUỐC CỦA DƯỢC SĨ (pharmacist's medicine catalog)
   - List with search, each item: box photo, name, active ingredient, strength,
     "Đã xác nhận" badge. Add flow: photograph the medicine box or leaflet, the app
     reads the text and pre-fills the form, the pharmacist reviews and confirms.

9. LỊCH SỬ
   - Calendar strip, daily list, weekly adherence chart (% đúng giờ), streak.

10. CÀI ĐẶT
   - Notification sound, reminder permissions help ("Để nhắc ổn định"),
     app lock (vân tay/PIN), hide medicine name on lock screen, dark mode, backup,
     family members.

Keep a consistent design system across all screens: same components, icons,
spacing and typography.
```
