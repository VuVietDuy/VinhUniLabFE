import React, { useState } from 'react';
import { Button, Card, Col, Row, Space, Typography, Tag, Badge, Tabs, Collapse } from 'antd';
import {
  DesktopOutlined,
  FolderOpenOutlined,
  TeamOutlined,
  AlertOutlined,
  CalendarOutlined,
  LoginOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  BankOutlined,
  ArrowRightOutlined,
  UserSwitchOutlined,
  ToolOutlined,
  DashboardOutlined,
  QuestionCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  RightOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export default function Home() {
  const navigate = useNavigate();
  const [activePreviewTab, setActivePreviewTab] = useState('rooms');

  // Kiểm tra trạng thái đăng nhập
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user: any = null;
  try {
    if (userStr) user = JSON.parse(userStr);
  } catch (e) {
    user = null;
  }

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'TEACHER') return '/teacher';
    if (user.role === 'TECHNICIAN') return '/technician';
    return '/login';
  };

  // Mock data cho phần tương tác xem trước (Live Preview)
  const mockRooms = [
    { name: 'Phòng Máy 101 (Lab AI)', count: '45 Máy', status: 'Đang hoạt động', teacher: 'ThS. Nguyễn Văn A', color: 'green' },
    { name: 'Phòng Máy 202 (Mạng MT)', count: '40 Máy', status: 'Đang thực hành', teacher: 'TS. Trần Thị B', color: 'blue' },
    { name: 'Phòng Máy 303 (Lập trình)', count: '50 Máy', status: 'Trống (Sẵn sàng)', teacher: 'Chưa có ca', color: 'cyan' },
    { name: 'Phòng Máy 404 (Hệ điều hành)', count: '42 Máy', status: 'Đang bảo trì 2 máy', teacher: 'KTV. Lê Văn C', color: 'orange' },
  ];

  const mockIncidents = [
    { id: 'INC-102', room: 'Phòng 202 - Máy #14', issue: 'Hỏng chuột & màn hình chớp', status: 'Đã phân công KTV', time: '10 phút trước', tag: 'processing' },
    { id: 'INC-101', room: 'Phòng 101 - Máy #05', issue: 'Mất kết nối mạng LAN', status: 'Đã xử lý xong', time: '1 giờ trước', tag: 'success' },
    { id: 'INC-099', room: 'Phòng 303 - Máy #22', issue: 'Lỗi bàn phím liệt phím Space', status: 'Đã hoàn thành', time: '2 giờ trước', tag: 'success' },
  ];

  const features = [
    {
      icon: <DesktopOutlined style={{ fontSize: 28, color: '#38bdf8' }} />,
      title: 'Quản Lý Máy Tính Chi Tiết',
      description: 'Giao diện sơ đồ phòng trực quan, quản lý cấu hình, tình trạng phần cứng và lịch sử sửa chữa từng máy.',
    },
    {
      icon: <FolderOpenOutlined style={{ fontSize: 28, color: '#a855f7' }} />,
      title: 'Quản Lý Phòng Thực Hành',
      description: 'Khởi tạo, điều chỉnh danh mục phòng máy, phân loại theo chuyên ngành và quy mô thiết bị.',
    },
    {
      icon: <CalendarOutlined style={{ fontSize: 28, color: '#f59e0b' }} />,
      title: 'Đăng Ký & Xếp Lịch Thông Minh',
      description: 'Giảng viên đăng ký phòng máy theo ca, trùng lịch tự động được cảnh báo, duyệt yêu cầu tức thì.',
    },
    {
      icon: <AlertOutlined style={{ fontSize: 28, color: '#ef4444' }} />,
      title: 'Báo Cáo Sự Cố Real-time',
      description: 'Giảng viên gửi phản ánh hỏng hóc ngay tại lớp; Kỹ thuật viên tiếp nhận và xử lý siêu tốc.',
    },
    {
      icon: <UserSwitchOutlined style={{ fontSize: 28, color: '#10b981' }} />,
      title: 'Phân Quyền 3 Cấp Nghiêm Ngạc',
      description: 'Tách biệt rõ ràng quyền hạn giữa Admin quản trị, Giảng viên giảng dạy và Kỹ thuật viên bảo trì.',
    },
    {
      icon: <DashboardOutlined style={{ fontSize: 28, color: '#6366f1' }} />,
      title: 'Thống Kê & Nhật Ký Hệ Thống',
      description: 'Báo cáo trực quan tần suất sử dụng phòng máy, hiệu suất thiết bị và lịch sử hoạt động toàn trường.',
    },
  ];

  const faqItems = [
    {
      key: '1',
      label: 'Ai có thể truy cập và sử dụng hệ thống VinhUniLab?',
      children: (
        <Text style={{ color: '#94a3b8' }}>
          Hệ thống được thiết kế dành cho Quản trị viên (Admin), Giảng viên giảng dạy các môn thực hành và Kỹ thuật viên phòng máy thuộc Trường Đại học Vinh.
        </Text>
      ),
    },
    {
      key: '2',
      label: 'Làm thế nào để Giảng viên đăng ký phòng máy thực hành?',
      children: (
        <Text style={{ color: '#94a3b8' }}>
          Giảng viên chỉ cần đăng nhập tài khoản Giảng viên, chọn mục "Đăng ký phòng máy", chọn ca học và ngày muốn mượn. Yêu cầu sẽ tự động chuyển tới Admin để phê duyệt.
        </Text>
      ),
    },
    {
      key: '3',
      label: 'Quy trình xử lý khi phát hiện máy tính bị hỏng hóc trong ca học?',
      children: (
        <Text style={{ color: '#94a3b8' }}>
          Giảng viên truy cập mục "Báo cáo sự cố", chọn đúng số máy và mô tả lỗi. Kỹ thuật viên trực ca sẽ nhận được thông báo tức thì để đến kiểm tra và khắc phục.
        </Text>
      ),
    },
  ];

  return (
    <div className="vinhuni-landing">
      {/* 1. Header Navigation Bar */}
      <header className="vinhuni-navbar">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
              <BankOutlined style={{ fontSize: 22, color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }} className="gradient-text-primary">
                VinhUniLab
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                Trường Đại học Vinh
              </div>
            </div>
          </div>

          {/* Quick Menu Links */}
          <Space size="large" className="desktop-menu" style={{ display: 'flex' }}>
            <a href="#features" className="footer-link" style={{ fontWeight: 500 }}>Tính năng</a>
            <a href="#roles" className="footer-link" style={{ fontWeight: 500 }}>Vai trò hệ thống</a>
            <a href="#preview" className="footer-link" style={{ fontWeight: 500 }}>Xem trước</a>
            <a href="#faq" className="footer-link" style={{ fontWeight: 500 }}>Trợ giúp & FAQ</a>
          </Space>

          {/* User Auth Buttons */}
          <Space>
            {token ? (
              <Button
                type="primary"
                size="large"
                icon={<DashboardOutlined />}
                style={{ borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', fontWeight: 600 }}
                onClick={() => navigate(getDashboardPath())}
              >
                Vào Bảng Điều Khiển
              </Button>
            ) : (
              <>
                <Button
                  type="text"
                  style={{ color: '#cbd5e1', fontWeight: 500 }}
                  onClick={() => navigate('/login')}
                >
                  Đăng nhập
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<LoginOutlined />}
                  style={{ borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', fontWeight: 600, boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
                  onClick={() => navigate('/login')}
                >
                  Truy cập Hệ thống
                </Button>
              </>
            )}
          </Space>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="hero-wrapper">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Row align="middle" gutter={[48, 48]}>
            {/* Left Col: Hero Text */}
            <Col xs={24} lg={13}>
              <div className="hero-badge">
                <SafetyCertificateOutlined style={{ color: '#38bdf8' }} />
                <span>Hệ thống Quản lý Phòng máy Thông minh - Trường Đại học Vinh</span>
              </div>

              <Title level={1} style={{ color: '#ffffff', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>
                Quản lý & Vận hành <br />
                <span className="gradient-text-primary">Phòng Máy Thực Hành</span> Tập Trung
              </Title>

              <Paragraph style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, marginBottom: 32 }}>
                Giải pháp chuyển đổi số toàn diện cho phòng thực hành máy tính. Đồng bộ lịch đăng ký, giám sát trạng thái thiết bị thời gian thực và tự động hóa quy trình xử lý sự cố dành cho Giảng viên, Kỹ thuật viên & Quản trị viên.
              </Paragraph>

              {/* Action Buttons */}
              <Space wrap size="middle" style={{ marginBottom: 36 }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowRightOutlined />}
                  style={{
                    height: 52,
                    padding: '0 32px',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #3b82f6, #818cf8)',
                    border: 'none',
                    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)',
                  }}
                  onClick={() => navigate('/login')}
                >
                  Bắt đầu sử dụng
                </Button>

                <Button
                  size="large"
                  icon={<CalendarOutlined />}
                  style={{
                    height: 52,
                    padding: '0 28px',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 600,
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderColor: 'rgba(255,255,255,0.15)',
                    color: '#f1f5f9',
                  }}
                  onClick={() => navigate('/login')}
                >
                  Xem lịch phòng máy
                </Button>
              </Space>

              {/* Role Demo Quick Login Labels */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Text style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Dùng thử tài khoản Demo:</Text>
                <Tag color="red" style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 6, fontWeight: 600 }} onClick={() => navigate('/login')}>
                  Admin (admin/123)
                </Tag>
                <Tag color="blue" style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 6, fontWeight: 600 }} onClick={() => navigate('/login')}>
                  Giảng viên (teacher/123)
                </Tag>
                <Tag color="green" style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 6, fontWeight: 600 }} onClick={() => navigate('/login')}>
                  Kỹ thuật viên (technician/123)
                </Tag>
              </div>
            </Col>

            {/* Right Col: Interactive Visual Hero Dashboard Card */}
            <Col xs={24} lg={11}>
              <div className="floating-mockup">
                <div style={{
                  background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
                  borderRadius: 24,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: 24,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.15)',
                  backdropFilter: 'blur(12px)',
                }}>
                  {/* Top Bar of Mockup */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, marginBottom: 20, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></div>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }}></div>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></div>
                      <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 8, fontWeight: 500 }}>VinhUniLab Control Panel</span>
                    </div>
                    <Badge status="processing" text={<span style={{ color: '#34d399', fontSize: 12, fontWeight: 600 }}>Live Realtime</span>} />
                  </div>

                  {/* Realtime Overview Card Grid */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                    <Col span={12}>
                      <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 16, borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Tổng số phòng máy</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#38bdf8' }}>15 Phòng</div>
                        <div style={{ fontSize: 11, color: '#34d399', marginTop: 4 }}>● 12 Phòng đang học</div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 16, borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Tỷ lệ máy sẵn sàng</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#34d399' }}>98.5%</div>
                        <div style={{ fontSize: 11, color: '#a855f7', marginTop: 4 }}>600 / 609 Máy tính</div>
                      </div>
                    </Col>
                  </Row>

                  {/* Active Schedule Item */}
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: '#60a5fa', fontWeight: 600, fontSize: 13 }}>CA SÁNG (07:00 - 11:30)</span>
                      <Tag color="blue">Phòng 201 (Lab AI)</Tag>
                    </div>
                    <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Môn: Lập trình Mạng Căn bản</div>
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>Giảng viên: TS. Nguyễn Hoàng Nam (Khoa CNTT)</div>
                  </div>

                  {/* Incident Quick Tracker */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                      <div>
                        <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 500 }}>Báo hỏng máy #12 - Lab 102</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>Đã phân công KTV sửa chữa</div>
                      </div>
                    </div>
                    <Tag color="orange">Đang xử lý</Tag>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* 3. Live Metrics Bar */}
      <section style={{ padding: '20px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>
        <Row gutter={[20, 20]}>
          <Col xs={12} sm={6}>
            <div className="stat-card-item">
              <FolderOpenOutlined style={{ fontSize: 32, color: '#38bdf8', marginBottom: 12 }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff' }}>15+</div>
              <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Phòng thực hành CNTT</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="stat-card-item">
              <DesktopOutlined style={{ fontSize: 32, color: '#818cf8', marginBottom: 12 }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff' }}>600+</div>
              <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Máy tính cấu hình cao</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="stat-card-item">
              <CheckCircleOutlined style={{ fontSize: 32, color: '#34d399', marginBottom: 12 }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff' }}>99.2%</div>
              <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Thời gian sẵn sàng</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="stat-card-item">
              <ThunderboltOutlined style={{ fontSize: 32, color: '#f59e0b', marginBottom: 12 }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff' }}>&lt; 15m</div>
              <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Phản hồi sự cố thiết bị</div>
            </div>
          </Col>
        </Row>
      </section>

      {/* 4. System Roles Section */}
      <section id="roles" style={{ padding: '80px 24px', background: 'rgba(30, 41, 59, 0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <Tag color="purple" style={{ padding: '4px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              PHÂN QUYỀN HỆ THỐNG
            </Tag>
            <Title level={2} style={{ color: '#ffffff', fontSize: 36, fontWeight: 700, margin: '8px 0 16px' }}>
              Giải pháp tối ưu cho từng Vai trò
            </Title>
            <Paragraph style={{ color: '#94a3b8', fontSize: 16, maxWidth: 680, margin: '0 auto' }}>
              VinhUniLab mang lại giao diện được thiết kế riêng biệt cho 3 nhóm người dùng trong nhà trường.
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {/* Admin Role */}
            <Col xs={24} md={8}>
              <Card className="role-card-admin" style={{ borderRadius: 20, height: '100%' }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <SafetyCertificateOutlined style={{ fontSize: 28, color: '#ef4444' }} />
                </div>
                <Title level={3} style={{ color: '#ffffff', marginTop: 0, marginBottom: 12 }}>
                  Quản trị viên (Admin)
                </Title>
                <Paragraph style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
                  Toàn quyền quản lý danh mục phòng máy, sơ đồ vị trí máy tính, phê duyệt đăng ký mượn phòng, khởi tạo ca học và quản lý tài khoản người dùng.
                </Paragraph>
                <Space direction="vertical" style={{ width: '100%', color: '#cbd5e1', fontSize: 14 }}>
                  <div>✓ Quản lý phòng & cấu hình máy tính</div>
                  <div>✓ Phê duyệt yêu cầu đặt phòng máy</div>
                  <div>✓ Phân công Kỹ thuật viên xử lý báo hỏng</div>
                  <div>✓ Xem báo cáo & thống kê tổng thể</div>
                </Space>
              </Card>
            </Col>

            {/* Teacher Role */}
            <Col xs={24} md={8}>
              <Card className="role-card-teacher" style={{ borderRadius: 20, height: '100%' }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <TeamOutlined style={{ fontSize: 28, color: '#3b82f6' }} />
                </div>
                <Title level={3} style={{ color: '#ffffff', marginTop: 0, marginBottom: 12 }}>
                  Giảng viên (Teacher)
                </Title>
                <Paragraph style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
                  Đăng ký lịch phòng máy cho các buổi giảng dạy thực hành, theo dõi trạng thái phê duyệt ca học và trực tiếp báo cáo sự cố thiết bị nhanh chóng.
                </Paragraph>
                <Space direction="vertical" style={{ width: '100%', color: '#cbd5e1', fontSize: 14 }}>
                  <div>✓ Tra cứu thời khóa biểu phòng máy trống</div>
                  <div>✓ Gửi đăng ký sử dụng phòng máy theo ca</div>
                  <div>✓ Báo cáo lỗi máy hỏng tại chỗ trong ca học</div>
                  <div>✓ Theo dõi lịch sử mượn phòng cá nhân</div>
                </Space>
              </Card>
            </Col>

            {/* Technician Role */}
            <Col xs={24} md={8}>
              <Card className="role-card-technician" style={{ borderRadius: 20, height: '100%' }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <ToolOutlined style={{ fontSize: 28, color: '#10b981' }} />
                </div>
                <Title level={3} style={{ color: '#ffffff', marginTop: 0, marginBottom: 12 }}>
                  Kỹ thuật viên (Technician)
                </Title>
                <Paragraph style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
                  Tiếp nhận các báo cáo hỏng hóc thiết bị phần cứng/phần mềm từ Giảng viên, cập nhật tiến độ bảo trì và khôi phục trạng thái hoạt động của máy.
                </Paragraph>
                <Space direction="vertical" style={{ width: '100%', color: '#cbd5e1', fontSize: 14 }}>
                  <div>✓ Nhận thông báo sự cố được phân công</div>
                  <div>✓ Cập nhật tiến độ sửa chữa máy tính</div>
                  <div>✓ Quản lý lịch sử thay thế linh kiện</div>
                  <div>✓ Đóng báo cáo sau khi hoàn thành sửa</div>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* 5. Core Features Grid */}
      <section id="features" style={{ padding: '90px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Tag color="cyan" style={{ padding: '4px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            TÍNH NĂNG NỔI BẬT
          </Tag>
          <Title level={2} style={{ color: '#ffffff', fontSize: 36, fontWeight: 700, margin: '8px 0 16px' }}>
            Nền tảng quản lý phòng máy chuyên nghiệp
          </Title>
          <Paragraph style={{ color: '#94a3b8', fontSize: 16, maxWidth: 680, margin: '0 auto' }}>
            Trang bị đầy đủ công cụ cần thiết để vận hành hệ thống phòng máy tính quy mô lớn một cách chính xác và hiệu quả.
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {features.map((item, index) => (
            <Col key={index} xs={24} sm={12} lg={8}>
              <Card className="vinhuni-feature-card" style={{ padding: 12, height: '100%' }}>
                <div style={{ marginBottom: 20 }}>{item.icon}</div>
                <Title level={4} style={{ color: '#ffffff', marginBottom: 12, fontSize: 18 }}>
                  {item.title}
                </Title>
                <Paragraph style={{ color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
                  {item.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* 6. Interactive Live Preview Showcase */}
      <section id="preview" style={{ padding: '80px 24px', background: 'rgba(30, 41, 59, 0.4)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <Tag color="blue" style={{ padding: '4px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              TRẢI NGHIỆM TRỰC QUAN
            </Tag>
            <Title level={2} style={{ color: '#ffffff', fontSize: 36, fontWeight: 700, margin: '8px 0 16px' }}>
              Khám Phá Giao Diện VinhUniLab
            </Title>
            <Paragraph style={{ color: '#94a3b8', fontSize: 16 }}>
              Xem trước dữ liệu phòng máy và danh sách sự cố realtime đang diễn ra trong hệ thống.
            </Paragraph>
          </div>

          <div style={{ background: '#1e293b', borderRadius: 20, border: '1px solid rgba(255, 255, 255, 0.1)', padding: 24 }}>
            <Tabs
              activeKey={activePreviewTab}
              onChange={setActivePreviewTab}
              type="card"
              items={[
                {
                  key: 'rooms',
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
                      <FolderOpenOutlined /> Trạng Thái Phòng Máy
                    </span>
                  ),
                  children: (
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                      {mockRooms.map((room, idx) => (
                        <Col key={idx} xs={24} sm={12} lg={6}>
                          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 20, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                              <Text strong style={{ color: '#f8fafc', fontSize: 15 }}>{room.name}</Text>
                              <Tag color={room.color}>{room.status}</Tag>
                            </div>
                            <div style={{ color: '#38bdf8', fontSize: 13, marginBottom: 4 }}>Quy mô: {room.count}</div>
                            <div style={{ color: '#94a3b8', fontSize: 12 }}>Phụ trách: {room.teacher}</div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  ),
                },
                {
                  key: 'incidents',
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
                      <AlertOutlined /> Nhật Ký Báo Sự Cố
                    </span>
                  ),
                  children: (
                    <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
                      {mockIncidents.map((inc, idx) => (
                        <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <Space align="center">
                              <Tag color="volcano">{inc.id}</Tag>
                              <Text strong style={{ color: '#f8fafc' }}>{inc.room}</Text>
                            </Space>
                            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Mô tả lỗi: {inc.issue}</div>
                          </div>
                          <Space align="center">
                            <span style={{ color: '#64748b', fontSize: 12 }}><ClockCircleOutlined /> {inc.time}</span>
                            <Tag color={inc.tag}>{inc.status}</Tag>
                          </Space>
                        </div>
                      ))}
                    </Space>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section id="faq" style={{ padding: '80px 24px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <QuestionCircleOutlined style={{ fontSize: 36, color: '#38bdf8', marginBottom: 12 }} />
          <Title level={2} style={{ color: '#ffffff', fontSize: 32, margin: 0 }}>
            Câu Hỏi Thường Gặp (FAQ)
          </Title>
        </div>

        <Collapse
          items={faqItems}
          bordered={false}
          style={{ background: '#1e293b', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.1)' }}
        />
      </section>

      {/* 8. Call to Action (CTA Banner) */}
      <section style={{ padding: '0 24px 90px' }}>
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e293b 100%)',
          borderRadius: 28,
          padding: '60px 32px',
          textAlign: 'center',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 20px 50px rgba(49, 46, 129, 0.4)',
        }}>
          <Title level={2} style={{ color: '#ffffff', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, marginBottom: 16 }}>
            Sẵn sàng trải nghiệm VinhUniLab?
          </Title>
          <Paragraph style={{ color: '#c7d2fe', fontSize: 16, maxWidth: 640, margin: '0 auto 32px' }}>
            Đăng nhập ngay với tài khoản của bạn để truy cập bảng điều khiển Admin, Giảng viên hoặc Kỹ thuật viên.
          </Paragraph>
          <Space wrap size="middle">
            <Button
              type="primary"
              size="large"
              icon={<LoginOutlined />}
              style={{
                height: 50,
                padding: '0 32px',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                border: 'none',
                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
              }}
              onClick={() => navigate('/login')}
            >
              Đăng nhập Hệ thống
            </Button>
          </Space>
        </div>
      </section>

      {/* 9. Footer */}
      <footer style={{ background: '#090d16', borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '60px 24px 30px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Row gutter={[48, 32]} style={{ marginBottom: 48 }}>
            <Col xs={24} md={10}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BankOutlined style={{ fontSize: 18, color: '#ffffff' }} />
                </div>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#ffffff' }}>VinhUniLab</span>
              </div>
              <Paragraph style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, maxWidth: 400 }}>
                Hệ thống Quản lý Phòng máy Tính Trường Đại học Vinh. Tối ưu hóa lịch thực hành, giám sát thiết bị phần cứng và tự động hóa báo cáo sự cố.
              </Paragraph>
            </Col>

            <Col xs={12} sm={7} md={7}>
              <div style={{ color: '#f8fafc', fontWeight: 600, marginBottom: 16 }}>Liên kết nhanh</div>
              <Space direction="vertical" size="small">
                <a href="#features" className="footer-link">Tính năng chính</a>
                <a href="#roles" className="footer-link">Phân quyền vai trò</a>
                <a href="#preview" className="footer-link">Giao diện xem trước</a>
                <a href="#faq" className="footer-link">Câu hỏi thường gặp</a>
              </Space>
            </Col>

            <Col xs={12} sm={7} md={7}>
              <div style={{ color: '#f8fafc', fontWeight: 600, marginBottom: 16 }}>Thông tin liên hệ</div>
              <Space direction="vertical" size="small" style={{ color: '#94a3b8', fontSize: 14 }}>
                <div><GlobalOutlined /> Trường Đại học Vinh</div>
                <div>182 Lê Duẩn, TP. Vinh, Nghệ An</div>
                <div><PhoneOutlined /> Hotline CNTT: (0238) 3855.452</div>
                <div><MailOutlined /> Email: cntt@vinhuni.edu.vn</div>
              </Space>
            </Col>
          </Row>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            © {new Date().getFullYear()} VinhUniLab - Trường Đại học Vinh. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

