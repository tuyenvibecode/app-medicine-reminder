// Mục đích: Tab Phiếu note trên thanh điều hướng đáy trỏ tới màn hình lên đơn thuốc.
// app/(tabs)/prescription.tsx
// Tab "Tạo đơn thuốc" trên thanh điều hướng đáy (Bottom Bar)

import CreatePrescriptionScreen from '../prescription/create';

export default function PrescriptionTab() {
  return <CreatePrescriptionScreen />;
}
