import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Card, Tag } from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  SearchOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { userApi, type User, type UserRole } from '../../api/user';
import { getApiErrorMessage, isFormValidationError } from '../../utils/apiError';
import { UserImportModal } from '../../components/admin/UserImportModal';
import { exportUsersToExcel } from '../../utils/excelParser';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("id!=0");
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await userApi.search({
        page,
        size,
        filter,
        sort: ['id,desc']
      });
      setUsers(response.data.content);
      setTotal(response.data.totalElements);
    } catch (error) {
      message.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [size, page, filter]);

  // Hàm xuất danh sách người dùng ra file Excel
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await userApi.getAll();
      const allUsers = response.data;
      if (!allUsers || allUsers.length === 0) {
        message.warning('Không tìm thấy dữ liệu người dùng để xuất Excel');
        return;
      }
      exportUsersToExcel(allUsers);
      message.success(`Đã xuất ${allUsers.length} tài khoản người dùng ra file Excel thành công!`);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Xuất danh sách người dùng thất bại'));
    } finally {
      setExporting(false);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await userApi.update(editingUser.id, values);
        message.success('Cập nhật người dùng thành công');
      } else {
        await userApi.create(values);
        message.success('Tạo tài khoản thành công');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      if (isFormValidationError(error)) {
        return;
      }

      message.error(getApiErrorMessage(error));
    }
  };

  const roleColors: Record<UserRole, string> = {
    ADMIN: 'magenta',
    TEACHER: 'blue',
    TECHNICIAN: 'orange',
  };

  const columns: ColumnsType<User> = [
    {
      title: 'STT',
      key: 'index',
      width: 70,
      render: (_value, _record, index) => (page * size) + index + 1,
    },
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <span style={{ fontWeight: 'bold' }}>{text}</span>
    },
    { title: 'Họ và tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Quyền hạn',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <Tag color={roleColors[role]}>{role}</Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            type="text"
            onClick={() => {
              setEditingUser(record);
              form.setFieldsValue({ ...record, password: '' }); // Không hiện mật khẩu cũ
              setIsModalOpen(true);
            }}
          />
          {record.role !== 'ADMIN' && ( // Không cho phép xóa Admin chính qua UI này
            <Popconfirm title="Xóa người dùng này?" onConfirm={() => userApi.delete(record.id).then(() => fetchUsers())}>
              <Button icon={<DeleteOutlined />} type="text" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const handleSearch = (value: string) => {
    setPage(0);
    setFilter(buildUserFilter(value));
  };

  const buildUserFilter = (keyword: string) => {
    const value = keyword.trim();
    if (!value) return 'id!=0';

    const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `(username=='*${escapedValue}*',fullName=='*${escapedValue}*')`;
  };


  return (
    <Card
      style={{ margin: '16px 16px' }}
      title={<span><UserOutlined /> Quản lý tài khoản hệ thống</span>}
      extra={
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>Làm mới</Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            loading={exporting}
            style={{ color: '#1677ff', borderColor: '#1677ff', fontWeight: 600 }}
          >
            Export Excel
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            onClick={() => setIsImportModalOpen(true)}
            style={{ color: '#27ae60', borderColor: '#27ae60', fontWeight: 600 }}
          >
            Import Excel
          </Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => {
            setEditingUser(null);
            form.resetFields();
            setIsModalOpen(true);
          }}>
            Thêm người dùng
          </Button>
        </Space>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          enterButton={<SearchOutlined />}
          placeholder="Tìm theo tên hoặc mã người dùng"
          style={{ width: 320 }}
          value={searchText}
          onChange={(event) => {
            const value = event.target.value;
            setSearchText(value);
            if (!value) {
              handleSearch('');
            }
          }}
          onSearch={handleSearch}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page + 1,
          pageSize: size,
          total,
          onChange: (page, pageSize) => {
            setPage(page - 1);
            setSize(pageSize);
          },
        }}
      />

      <Modal
        title={editingUser ? "Chỉnh sửa người dùng" : "Tạo tài khoản mới"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="Tên đăng nhập"
            rules={[{ required: true, message: 'Vui lòng nhập username' }]}
          >
            <Input disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu"}
            rules={[{ required: !editingUser, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ type: 'email' }, { required: true }]}>
            <Input prefix={<MailOutlined />} />
          </Form.Item>

          <Form.Item name="role" label="Quyền hạn" initialValue="TEACHER">
            <Select>
              <Select.Option value="TEACHER">Giáo viên</Select.Option>
              <Select.Option value="TECHNICIAN">Kỹ thuật viên</Select.Option>
              <Select.Option value="ADMIN">Quản trị viên</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Import danh sách người dùng từ file Excel */}
      <UserImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchUsers}
      />
    </Card>
  );
};

export default UserManagement;
