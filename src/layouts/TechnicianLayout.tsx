import { useState } from 'react';
import {
  DownOutlined,
  FileDoneOutlined,
  LogoutOutlined,
  PieChartOutlined,
  ProfileOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Avatar, Dropdown, Layout, Menu, message, Space, theme } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const { Header, Content, Footer, Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(label: React.ReactNode, key: React.Key, icon?: React.ReactNode): MenuItem {
  return {
    key,
    icon,
    label,
  } as MenuItem;
}

const items: MenuItem[] = [
  getItem('Thống kê', '/technician', <PieChartOutlined />),
  getItem('Sự cố được gán', '/technician/assigned-incidents', <FileDoneOutlined />),
];

const TechnicianLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate();
  const { logout } = useAuth();

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
      onClick: () => navigate('/technician/profile'),
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
      <Sider width={240} collapsible collapsed={collapsed} onCollapse={value => setCollapsed(value)}>
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          defaultSelectedKeys={['/technician']}
          mode="inline"
          items={items}
          onClick={event => navigate(event.key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <ToolOutlined />
            <span style={{ fontWeight: 600 }}>Kỹ thuật viên</span>
          </Space>
          <Dropdown menu={{ items: userMenu }} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#fa8c16' }} />
              <span style={{ fontWeight: 500 }}>Technician User</span>
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

export default TechnicianLayout;
