import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Avatar,
  Typography,
  Tag,
  Tabs,
  Form,
  Input,
  Button,
  message,
  Space,
  Divider,
  Timeline,
  Alert
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  KeyOutlined,
  BellOutlined,
  BankOutlined
} from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../api/auth';

const { Title, Text, Paragraph } = Typography;


const roleBadgeMap: Record<string, { color: string; label: string }> = {
  ADMIN: { color: 'red', label: 'Quản trị viên (Admin)' },
  TEACHER: { color: 'blue', label: 'Giảng viên (Teacher)' },
  TECHNICIAN: { color: 'orange', label: 'Kỹ thuật viên (Technician)' },
};

const Profile: React.FC = () => {
  const { role } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // User state mock / initial values
  const [userInfo, setUserInfo] = useState({
    username: localStorage.getItem('username') || (role ? role.toLowerCase() : 'user'),
    fullName: localStorage.getItem('fullName') || (role === 'ADMIN' ? 'Nguyễn Văn Admin' : role === 'TEACHER' ? 'TS. Nguyễn Văn A' : 'KTV. Trần Văn B'),
    email: localStorage.getItem('email') || `${role ? role.toLowerCase() : 'user'}@vinhuni.edu.vn`,
    phone: '0987.654.321',
    department: 'Khoa Công nghệ Thông tin - Trường Đại học Vinh',
    role: role || 'TEACHER',
    joinedDate: '15/01/2024'
  });

  useEffect(() => {
    profileForm.setFieldsValue(userInfo);
  }, [userInfo]);

  // Cập nhật thông tin cá nhân
  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      // Giả lập lưu thông tin
      setTimeout(() => {
        setUserInfo(prev => ({ ...prev, ...values }));
        localStorage.setItem('fullName', values.fullName);
        localStorage.setItem('email', values.email);
        message.success('Cập nhật thông tin cá nhân thành công!');
        setLoading(false);
      }, 600);
    } catch {
      message.error('Lỗi khi cập nhật thông tin');
      setLoading(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp!');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword
      });
      message.success(res.data?.message || 'Đổi mật khẩu thành công!');
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Đổi mật khẩu thất bại!');
    } finally {
      setSavingPassword(false);
    }
  };


  const roleInfo = roleBadgeMap[userInfo.role] || { color: 'blue', label: userInfo.role };

  return (
    <div style={{ padding: 0 }}>
      {/* Compact Clean Profile Header Card */}
      <Card
        style={{
          borderRadius: 12,
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Avatar
            size={76}
            icon={<UserOutlined />}
            style={{
              backgroundColor: '#1677ff',
              boxShadow: '0 4px 10px rgba(22, 119, 255, 0.25)',
              flexShrink: 0
            }}
          />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 700 }}>
                {userInfo.fullName}
              </Title>
              <Tag color={roleInfo.color} style={{ fontWeight: 600, borderRadius: 12, padding: '2px 12px', fontSize: 13 }}>
                {roleInfo.label}
              </Tag>
            </div>
            <Space wrap size={[16, 4]}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                <BankOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                {userInfo.department}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                <MailOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                {userInfo.email}
              </Text>
            </Space>
          </div>
        </div>
      </Card>

      {/* Main Tabs Details Container */}
      <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Tabs
          defaultActiveKey="info"
          items={[
            {
              key: 'info',
              label: (
                <span>
                  <IdcardOutlined /> Thông tin cá nhân
                </span>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  <Form
                    form={profileForm}
                    layout="vertical"
                    onFinish={handleUpdateProfile}
                    initialValues={userInfo}
                  >
                    <Row gutter={24}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="fullName"
                          label="Họ và tên"
                          rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                        >
                          <Input prefix={<UserOutlined />} placeholder="Nhập họ và tên" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="username"
                          label="Tên đăng nhập (Username)"
                        >
                          <Input prefix={<IdcardOutlined />} disabled readOnly />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item
                          name="email"
                          label="Địa chỉ Email"
                          rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' }
                          ]}
                        >
                          <Input prefix={<MailOutlined />} placeholder="Ví dụ: nguyenvana@vinhuni.edu.vn" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="phone"
                          label="Số điện thoại liên hệ"
                        >
                          <Input prefix={<PhoneOutlined />} placeholder="Ví dụ: 0987654321" />
                        </Form.Item>
                      </Col>

                      <Col xs={24}>
                        <Form.Item
                          name="department"
                          label="Đơn vị công tác / Khoa"
                        >
                          <Input prefix={<BankOutlined />} placeholder="Khoa Công nghệ Thông tin" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider />

                    <Form.Item>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        htmlType="submit"
                        loading={loading}
                        style={{ fontWeight: 600 }}
                      >
                        Lưu thay đổi thông tin
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              )
            },
            {
              key: 'security',
              label: (
                <span>
                  <LockOutlined /> Bảo mật & Đổi mật khẩu
                </span>
              ),
              children: (
                <div style={{ paddingTop: 8, maxWidth: 600 }}>
                  <Alert
                    message="Khuyến nghị bảo mật"
                    description="Vui lòng đặt mật khẩu có ít nhất 6 ký tự, kết hợp cả chữ cái và số để đảm bảo an toàn cho tài khoản."
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                  />

                  <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handleChangePassword}
                  >
                    <Form.Item
                      name="currentPassword"
                      label="Mật khẩu hiện tại"
                      rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
                    >
                      <Input.Password prefix={<KeyOutlined />} placeholder="Nhập mật khẩu hiện tại" />
                    </Form.Item>

                    <Form.Item
                      name="newPassword"
                      label="Mật khẩu mới"
                      rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                        { min: 6, message: 'Mật khẩu mới phải từ 6 ký tự trở lên!' }
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới" />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      label="Xác nhận mật khẩu mới"
                      rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu mới!' }]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 16 }}>
                      <Button
                        type="primary"
                        danger
                        icon={<SafetyCertificateOutlined />}
                        htmlType="submit"
                        loading={savingPassword}
                        style={{ fontWeight: 600 }}
                      >
                        Cập nhật mật khẩu mới
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              )
            },
            {
              key: 'activity',
              label: (
                <span>
                  <ClockCircleOutlined /> Lịch sử hoạt động
                </span>
              ),
              children: (
                <div style={{ paddingTop: 12 }}>
                  <Timeline
                    items={[
                      {
                        color: 'green',
                        dot: <CheckCircleOutlined style={{ fontSize: 16 }} />,
                        children: (
                          <div>
                            <Text strong>Đăng nhập hệ thống thành công</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>Hôm nay lúc {new Date().toLocaleTimeString('vi-VN')} - IP: 113.160.xx.xx</Text>
                          </div>
                        )
                      },
                      {
                        color: 'blue',
                        dot: <BellOutlined style={{ fontSize: 16 }} />,
                        children: (
                          <div>
                            <Text strong>Tải dữ liệu thông tin phòng máy VinhUniLab</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>Hôm nay lúc {new Date().toLocaleTimeString('vi-VN')}</Text>
                          </div>
                        )
                      },
                      {
                        color: 'gray',
                        children: (
                          <div>
                            <Text strong>Khởi tạo tài khoản hệ thống VinhUniLab</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>Ngày {userInfo.joinedDate}</Text>
                          </div>
                        )
                      }
                    ]}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Profile;
