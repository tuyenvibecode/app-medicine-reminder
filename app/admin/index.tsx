// Mục đích: Màn hình quản trị gia đình cho chủ hộ quản lý thành viên, mã mời và phân quyền.
// app/admin/index.tsx
// Trang Quản trị Thành viên & Tài khoản Gia đình
// Dành riêng cho Chủ hộ (Admin) quản lý các thành viên, cấp mã mời và phân quyền

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppAlert as Alert } from '@/components/ui/app-dialog';
import {
  ArrowLeft,
  Users,
  Plus,
  ShieldCheck,
  Key,
  Copy,
  UserCheck,
  Stethoscope,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { FamilyMember, FamilyRole } from '@/types';

export default function FamilyAdminScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);

  // Modal tạo thành viên mới
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [newRole, setNewRole] = useState<FamilyRole>('patient');

  const handleCopyCode = (code?: string) => {
    if (!code) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { }
    Alert.alert(
      'Đã sao chép mã mời',
      `Mã mời: "${code}". Bạn có thể gửi mã này qua Zalo/Tin nhắn cho người nhà nhập vào app.`
    );
  };

  const handleCreateMember = () => {
    if (!newName.trim()) {
      Alert.alert('Chưa đủ thông tin', 'Vui lòng nhập tên người nhà.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { }

    // Tạo mã mời 6 ký tự ngẫu nhiên
    const randomCode = `GD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newMemberItem: FamilyMember = {
      id: `u-${Date.now()}`,
      name: newName.trim(),
      relationship: newRelationship.trim() || 'Thành viên',
      role: newRole,
      email: `${newName.toLowerCase().replace(/\s+/g, '')}@giadinh.local`,
      joinedAt: new Date().toISOString().split('T')[0],
      isActive: true,
      inviteCode: randomCode,
    };

    setMembers((prev) => [...prev, newMemberItem]);
    setModalVisible(false);
    setNewName('');
    setNewRelationship('');

    Alert.alert(
      'Tạo thành viên thành công!',
      `Đã tạo tài khoản cho "${newMemberItem.name}".\nMã mời kết nối 1-chạm: ${randomCode}\n(Gửi mã này cho người nhà để đăng nhập vào app).`
    );
  };

  const handleToggleMemberActive = (member: FamilyMember) => {
    if (member.role === 'admin') {
      Alert.alert('Không thể khoá', 'Tài khoản Quản trị viên chính không thể bị tạm khoá.');
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, isActive: !m.isActive } : m))
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/50">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 rounded-full bg-muted/60 items-center justify-center mr-3"
            accessibilityLabel="Quay lại"
          >
            <ArrowLeft size={20} color="#64748B" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-foreground">
              Quản trị Gia đình
            </Text>
            <Text className="text-xs text-muted-foreground">
              Quản lý tài khoản & phân quyền thành viên
            </Text>
          </View>
        </View>

        <Button
          variant="default"
          size="sm"
          className="flex-row items-center bg-primary px-3 rounded-full"
          onPress={() => setModalVisible(true)}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-white font-semibold text-xs ml-1">Thêm</Text>
        </Button>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Thẻ tóm tắt gia đình */}
        <Card className="mb-5 p-4 border-primary/30 bg-card">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold text-primary uppercase tracking-wider">
                Nhóm gia đình
              </Text>
              <Text className="text-lg font-bold text-foreground mt-0.5">
                Gia đình của tôi
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                {members.length > 0
                  ? `${members.filter((m) => m.isActive).length}/${members.length} tài khoản đang hoạt động`
                  : 'Chưa có thành viên nào được thêm'}
              </Text>
            </View>

            <View className="h-12 w-12 rounded-2xl bg-primary/15 items-center justify-center">
              <Users size={24} color="#0D9488" />
            </View>
          </View>
        </Card>

        {/* Danh sách thành viên */}
        <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 ml-1">
          Danh sách tài khoản ({members.length})
        </Text>

        {members.length === 0 ? (
          <Card className="items-center justify-center py-10 px-4 border-border/70">
            <Users size={38} color="#94A3B8" strokeWidth={1.5} />
            <Text className="text-base font-semibold text-foreground mt-3">
              Chưa có thành viên gia đình
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-1 mb-4">
              Thêm người thân và tạo mã mời để kết nối cùng nhau theo dõi lịch uống thuốc.
            </Text>
            <Button
              variant="default"
              size="sm"
              className="bg-primary px-4 rounded-xl"
              onPress={() => setModalVisible(true)}
            >
              <Text className="text-white font-semibold text-xs">+ Thêm thành viên</Text>
            </Button>
          </Card>
        ) : (
          members.map((member) => {
          const isAdmin = member.role === 'admin';
          const isPharmacist = member.role === 'pharmacist';

          return (
            <Card key={member.id} className="mb-3.5 p-4 border-border/70">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  {/* Icon theo vai trò */}
                  <View
                    className={`h-12 w-12 rounded-2xl items-center justify-center ${isAdmin
                        ? 'bg-primary/15'
                        : isPharmacist
                          ? 'bg-blue-500/15'
                          : 'bg-emerald-500/15'
                      }`}
                  >
                    {isAdmin ? (
                      <ShieldCheck size={22} color="#0D9488" />
                    ) : isPharmacist ? (
                      <Stethoscope size={22} color="#3B82F6" />
                    ) : (
                      <UserCheck size={22} color="#10B981" />
                    )}
                  </View>

                  <View className="ml-3.5 flex-1">
                    <View className="flex-row items-center flex-wrap gap-1.5">
                      <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                        {member.name}
                      </Text>
                      {!member.isActive && (
                        <Badge variant="destructive" label="Tạm khoá" />
                      )}
                    </View>
                    <Text className="text-xs text-muted-foreground mt-0.5">
                      {member.relationship} • {member.email}
                    </Text>
                  </View>
                </View>

                {/* Badge vai trò */}
                <Badge
                  variant={isAdmin ? 'default' : isPharmacist ? 'secondary' : 'outline'}
                  label={
                    isAdmin
                      ? 'Chủ hộ'
                      : isPharmacist
                        ? 'Dược sĩ'
                        : 'Người bệnh'
                  }
                />
              </View>

              {/* Thông tin mã mời & quản lý */}
              <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-border/40">
                {member.inviteCode ? (
                  <TouchableOpacity
                    onPress={() => handleCopyCode(member.inviteCode)}
                    className="flex-row items-center bg-muted/70 px-2.5 py-1 rounded-lg"
                  >
                    <Key size={12} color="#0D9488" />
                    <Text className="text-xs font-bold text-primary ml-1.5 font-mono">
                      {member.inviteCode}
                    </Text>
                    <Copy size={12} color="#64748B" className="ml-1.5" />
                  </TouchableOpacity>
                ) : (
                  <Text className="text-xs text-muted-foreground">Tài khoản chính</Text>
                )}

                {!isAdmin && (
                  <View className="flex-row gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5"
                      onPress={() => handleToggleMemberActive(member)}
                    >
                      <Text
                        className={`text-xs font-medium ${member.isActive ? 'text-muted-foreground' : 'text-emerald-600'
                          }`}
                      >
                        {member.isActive ? 'Tạm khoá' : 'Mở khoá'}
                      </Text>
                    </Button>
                  </View>
                )}
              </View>
            </Card>
          );
          })
        )}
      </ScrollView>

      {/* Modal tạo tài khoản người nhà mới */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <Card className="w-full max-w-sm p-5 border-border bg-card">
            <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
              <View className="flex-row items-center">
                <Users size={20} color="#0D9488" />
                <Text className="text-base font-bold text-foreground ml-2">
                  Thêm thành viên gia đình
                </Text>
              </View>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onPress={() => setModalVisible(false)}
              >
                <X size={18} color="#64748B" />
              </Button>
            </View>

            <Text className="text-xs font-semibold text-foreground mt-4 mb-1.5">
              Họ và tên người nhà *
            </Text>
            <Input
              value={newName}
              onChangeText={setNewName}
              placeholder="Ví dụ: Bác Ba, Nguyễn Văn C..."
              className="mb-3.5"
            />

            <Text className="text-xs font-semibold text-foreground mb-1.5">
              Mối quan hệ
            </Text>
            <Input
              value={newRelationship}
              onChangeText={setNewRelationship}
              placeholder="Ví dụ: Bố, Mẹ, Con, Ông bà..."
              className="mb-3.5"
            />

            <Text className="text-xs font-semibold text-foreground mb-1.5">
              Vai trò trong ứng dụng
            </Text>
            <View className="flex-row gap-2 mb-5">
              <TouchableOpacity
                onPress={() => setNewRole('patient')}
                className={`flex-1 p-2.5 rounded-xl border items-center ${newRole === 'patient'
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border'
                  }`}
              >
                <Text
                  className={`text-xs font-semibold ${newRole === 'patient' ? 'text-primary' : 'text-foreground'
                    }`}
                >
                  Người bệnh
                </Text>
                <Text className="text-[10px] text-muted-foreground mt-0.5">
                  Nhắc uống thuốc
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setNewRole('pharmacist')}
                className={`flex-1 p-2.5 rounded-xl border items-center ${newRole === 'pharmacist'
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border'
                  }`}
              >
                <Text
                  className={`text-xs font-semibold ${newRole === 'pharmacist' ? 'text-primary' : 'text-foreground'
                    }`}
                >
                  Dược sĩ gia đình
                </Text>
                <Text className="text-[10px] text-muted-foreground mt-0.5">
                  Gợi ý & duyệt thuốc
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-sm text-muted-foreground">Huỷ</Text>
              </Button>

              <Button
                variant="default"
                className="flex-1 bg-primary h-11 rounded-xl"
                onPress={handleCreateMember}
              >
                <Text className="text-sm font-semibold text-white">
                  Tạo mã mời
                </Text>
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
