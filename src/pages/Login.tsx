import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Row, Col, Checkbox, Space, Tag, Tooltip } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  BankOutlined
} from '@ant-design/icons';
import { login } from '../api/auth';

const { Title, Text, Paragraph } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Xử lý gửi Form đăng nhập chính
  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data = await login(values);

      // Lưu token và thông tin người dùng vào localStorage
      localStorage.setItem('token', data.accessToken || 'demo-token');
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('username', data.username);
      if (data.fullName) localStorage.setItem('fullName', data.fullName);

      message.success(`Chào mừng trở lại, ${data.fullName || data.username}!`);

      // Điều hướng theo vai trò (Role)
      if (data.role === 'ADMIN') {
        window.location.href = '/admin';
      } else if (data.role === 'TEACHER') {
        window.location.href = '/teacher';
      } else if (data.role === 'TECHNICIAN') {
        window.location.href = '/technician';
      } else {
        window.location.href = '/admin';
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản & mật khẩu!');
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập nhanh Demo cho các vai trò
  const handleQuickDemoLogin = (role: 'ADMIN' | 'TEACHER' | 'TECHNICIAN') => {
    const demoAccounts = {
      ADMIN: { username: 'admin', password: '123' },
      TEACHER: { username: 'teacher', password: '123' },
      TECHNICIAN: { username: 'technician', password: '123' },
    };

    const acc = demoAccounts[role];
    form.setFieldsValue(acc);
    onFinish({ username: acc.username, password: acc.password });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: 20
      }}
    >
      <Card
        style={{
          width: 960,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          border: 'none'
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Row style={{ minHeight: 560 }}>
          {/* Left Side: Brand Banner */}
          <Col
            xs={0}
            md={12}
            style={{
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 50%, #002766 100%)',
              padding: '48px 40px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#ffffff',
              position: 'relative'
            }}
          >
            <div>
              <Space align="center" style={{ marginBottom: 30 }}>
                <AvatarIcon />
                <div>
                  <Title level={3} style={{ color: '#ffffff', margin: 0, fontWeight: 700 }}>
                    VinhUniLab
                  </Title>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13 }}>
                    Trường Đại học Vinh
                  </Text>
                </div>
              </Space>

              <Title level={2} style={{ color: '#ffffff', fontWeight: 700, marginBottom: 16, lineHeight: 1.3 }}>
                Hệ thống Quản lý Phòng máy Tập trung
              </Title>

              <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, marginBottom: 30 }}>
                Giải pháp quản lý lịch thực hành, thiết bị máy tính và xử lý sự cố công nghệ thông tin thời gian thực.
              </Paragraph>

              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                  <span style={{ fontSize: 14 }}>Đặt lịch phòng máy trực quan dạng Calendar</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                  <span style={{ fontSize: 14 }}>Quản lý danh mục tiết học & máy tính thông minh</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                  <span style={{ fontSize: 14 }}>Tiếp nhận & xử lý sự cố thiết bị tức thì</span>
                </div>
              </Space>
            </div>

            <div style={{ paddingTop: 30, borderTop: '1px solid rgba(255, 255, 255, 0.15)', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              <BankOutlined style={{ marginRight: 6 }} />
              Bản quyền thuộc Trường Đại học Vinh ©{new Date().getFullYear()}
            </div>
          </Col>

          {/* Right Side: Login Form */}
          <Col
            xs={24}
            md={12}
            style={{
              padding: '48px 40px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              backgroundColor: '#ffffff'
            }}
          >
            <div style={{ marginBottom: 32 }}>
              <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#1f1f1f' }}>
                Đăng nhập hệ thống
              </Title>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Vui lòng nhập tài khoản và mật khẩu của bạn
              </Text>
            </div>

            <Form
              form={form}
              name="login_form"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#1677ff' }} />}
                  placeholder="Tên đăng nhập (Username)"
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#1677ff' }} />}
                  placeholder="Mật khẩu"
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>Ghi nhớ đăng nhập</Checkbox>
                </Form.Item>
                <a style={{ color: '#1677ff', fontSize: 13, fontWeight: 500 }} onClick={() => message.info('Vui lòng liên hệ Quản trị viên hệ thống để khôi phục mật khẩu!')}>
                  Quên mật khẩu?
                </a>
              </div>

              <Form.Item style={{ marginBottom: 20 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 16,
                    background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)'
                  }}
                >
                  Đăng nhập
                </Button>
              </Form.Item>
            </Form>

          </Col>
        </Row>
      </Card>
    </div>
  );
};

function AvatarIcon() {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)'
      }}
    >
      <DesktopOutlined style={{ fontSize: 24, color: '#ffffff' }} />
    </div>
  );
}

export default LoginPage;
