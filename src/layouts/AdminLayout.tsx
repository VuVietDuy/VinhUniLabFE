import { useState } from 'react';
import {
  DesktopOutlined,
  FileOutlined,
  PieChartOutlined,
  UserOutlined,
  LogoutOutlined,
  DownOutlined,
  ProfileOutlined,
  ClockCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, Dropdown, Avatar, Space, message } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const { Header, Footer, Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const items: MenuItem[] = [
  getItem('Thống kê', '/admin', <PieChartOutlined />),
  getItem('Quản lý phòng', '/admin/room-management', <DesktopOutlined />),
  getItem('Quản lý máy tính', '/admin/computer-management', <UserOutlined />),
  getItem('Quản lý tiết học', '/admin/time-slot-management', <ClockCircleOutlined />),
  getItem('Lịch phòng máy', '/admin/room-schedule', <CalendarOutlined />),
  getItem('Quản lý đặt phòng', '/admin/booking-management', <UserOutlined />),
  getItem('Quản lý báo cáo sự cố', '/admin/incident-management', <FileOutlined />),
  getItem('Quản lý người dùng', '/admin/user-management', <UserOutlined />),
];

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleMenuClick = (e: any) => {
    navigate(e.key);
  };

  const handleLogout = () => {
    logout();
    message.success('Đã đăng xuất thành công');
    navigate('/login');
  };

  const userMenuIds: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Trang cá nhân',
      icon: <ProfileOutlined />,
      onClick: () => navigate('/admin/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" />
        <Menu theme="dark" defaultSelectedKeys={['/admin']} mode="inline" items={items} onClick={handleMenuClick} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={{ items: userMenuIds }} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />
              <span style={{ fontWeight: 500 }}>Admin User</span>
              <DownOutlined style={{ fontSize: '12px' }} />
            </Space>
          </Dropdown>
        </Header>
        <Outlet />
        <Footer style={{ textAlign: 'center' }}>
          VinhUniLab ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
