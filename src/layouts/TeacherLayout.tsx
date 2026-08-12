import { useState } from 'react';
import {
  DesktopOutlined,
  FileOutlined,
  PieChartOutlined,
  UserOutlined,
  LogoutOutlined,
  DownOutlined,
  ProfileOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, Dropdown, Avatar, Space, message } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const { Header, Content, Footer, Sider } = Layout;

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
  getItem('Thống kê', '/teacher', <PieChartOutlined />),
  getItem('Quản lý mượn phòng', '/teacher/booking-management', <DesktopOutlined />),
  getItem('Lịch phòng máy', '/teacher/room-schedule', <CalendarOutlined />),
  getItem('Quản lý báo cáo sự cố', '/teacher/report-management', <FileOutlined />),
];

const TeacherLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
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

  const userMenu: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Trang cá nhân',
      icon: <ProfileOutlined />,
      onClick: () => navigate('/teacher/profile'),
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
        <Menu theme="dark" defaultSelectedKeys={['/teacher']} mode="inline" items={items} onClick={handleMenuClick} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={{ items: userMenu }} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span style={{ fontWeight: 500 }}>Teacher User</span>
              <DownOutlined style={{ fontSize: '12px' }} />
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '16px 16px' }}>
          <Outlet />
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          VinhUniLab ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default TeacherLayout;
