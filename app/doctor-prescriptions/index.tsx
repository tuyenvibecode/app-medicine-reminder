// Mục đích: Chuyển hướng tuyến /doctor-prescriptions cũ sang màn Quản lý Sức khoẻ (tab Hồ sơ đi khám).

import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function DoctorPrescriptionsRedirectScreen() {
  const { autoCapture } = useLocalSearchParams<{ autoCapture?: string }>();
  const target =
    autoCapture === 'true'
      ? '/health?tab=visits&autoCapture=true'
      : '/health?tab=visits';
  return <Redirect href={target as any} />;
}
