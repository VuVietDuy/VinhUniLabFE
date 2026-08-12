import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Card,
  Tag,
  Switch,
  Row,
  Col,
  Statistic,
  Segmented,
  Tooltip,
  Typography,
  Progress
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { roomApi, type Room } from '../../api/room';
import { getApiErrorMessage, isFormValidationError } from '../../utils/apiError';

const { Text, Title } = Typography;

const buildRoomFilter = (keyword: string) => {
  const value = keyword.trim();
  if (!value) return 'id!=0';

  const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `(roomName=='*${escapedValue}*',roomCode=='*${escapedValue}*')`;
};

const RoomManagement: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("id!=0");
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form] = Form.useForm();

  // Hàm tải dữ liệu từ API
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await roomApi.search({ filter, page, size, sort: ['id,desc'] });
      setRooms(response.data.content);
      setTotal(response.data.totalElements);
    } catch {
      message.error('Không thể tải danh sách phòng máy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [size, page, filter]);

  const showAddModal = () => {
    setEditingRoom(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const showEditModal = (record: Room) => {
    setEditingRoom(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingRoom) {
        await roomApi.update(editingRoom.id, values);
        message.success('Cập nhật phòng máy thành công');
      } else {
        await roomApi.create(values);
        message.success('Thêm phòng máy mới thành công');
      }
      setIsModalOpen(false);
      fetchRooms();
    } catch (error) {
      if (isFormValidationError(error)) return;
      message.error(getApiErrorMessage(error, 'Lưu thông tin phòng máy thất bại'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await roomApi.delete(id);
      message.success('Đã xóa phòng máy thành công');
      fetchRooms();
    } catch {
      message.error('Xóa phòng thất bại');
    }
  };

  const handleSearch = (value: string) => {
    setPage(0);
    setFilter(buildRoomFilter(value));
  };

  // Client-side status filter
  const displayedRooms = rooms.filter(r => {
    if (statusFilter === 'ACTIVE') return r.isActive;
    if (statusFilter === 'INACTIVE') return !r.isActive;
    return true;
  });

  // Calculate metrics
  const activeRoomsCount = rooms.filter(r => r.isActive).length;
  const inactiveRoomsCount = rooms.filter(r => !r.isActive).length;
  const totalSeatsSum = rooms.reduce((acc, curr) => acc + (curr.totalSeats || 0), 0);
  const totalComputersSum = rooms.reduce((acc, curr) => acc + (curr.computers?.length || 0), 0);

  const columns: ColumnsType<Room> = [
    {
      title: 'STT',
      key: 'index',
      width: 65,
      render: (_value, _record, index) => (page * size) + index + 1,
    },
    {
      title: 'Mã phòng',
      dataIndex: 'roomCode',
      key: 'roomCode',
      width: 120,
      render: (code: string) => <Tag color="blue" style={{ fontWeight: 600 }}>{code}</Tag>
    },
    {
      title: 'Tên phòng máy',
      dataIndex: 'roomName',
      key: 'roomName',
      sorter: (a, b) => a.roomName.localeCompare(b.roomName),
      render: (text: string) => (
        <span style={{ fontWeight: 600, color: '#1677ff' }}>
          <DesktopOutlined style={{ marginRight: 6 }} />
          {text}
        </span>
      )
    },
    {
      title: 'Vị trí (Tòa/Tầng)',
      dataIndex: 'location',
      key: 'location',
      render: (loc: string) => (
        <span>
          <EnvironmentOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
          {loc || 'Khu nhà Lab'}
        </span>
      )
    },
    {
      title: 'Số lượng máy',
      key: 'computerCount',
      sorter: (a, b) => (a.computers?.length || 0) - (b.computers?.length || 0),
      render: (_, record) => {
        const count = record.computers?.length || 0;
        return <Tag color="cyan">{count} máy tính</Tag>;
      }
    },
    {
      title: 'Số ghế',
      dataIndex: 'totalSeats',
      key: 'totalSeats',
      sorter: (a, b) => (a.totalSeats || 0) - (b.totalSeats || 0),
      render: (seats: number) => <span>{seats || 0} ghế</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'error'} icon={active ? <CheckCircleOutlined /> : <StopOutlined />}>
          {active ? 'Hoạt động' : 'Bảo trì'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa thông tin">
            <Button
              icon={<EditOutlined />}
              onClick={() => showEditModal(record)}
              type="text"
              style={{ color: '#1677ff' }}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa phòng máy này?"
            description="Lưu ý: Xóa phòng có thể ảnh hưởng đến danh sách máy tính bên trong."
            onConfirm={() => handleDelete(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Tooltip title="Xóa phòng">
              <Button icon={<DeleteOutlined />} type="text" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Top Banner Dashboard Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng phòng máy"
              value={total}
              prefix={<DesktopOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đang hoạt động"
              value={activeRoomsCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đang bảo trì"
              value={inactiveRoomsCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng ghế / máy"
              value={`${totalSeatsSum} ghế / ${totalComputersSum} máy`}
              prefix={<UsergroupAddOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Container Card */}
      <Card
        title={
          <span>
            <DesktopOutlined style={{ color: '#1677ff', marginRight: 8 }} />
            Quản lý Phòng máy VinhUniLab
          </span>
        }
        extra={
          <Space wrap>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'table' | 'card')}
              options={[
                { value: 'table', icon: <UnorderedListOutlined /> },
                { value: 'card', icon: <AppstoreOutlined /> },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchRooms}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} style={{ fontWeight: 600 }}>
              Thêm phòng máy
            </Button>
          </Space>
        }
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {/* Search & Filter Bar */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={10}>
            <Input.Search
              allowClear
              enterButton={<SearchOutlined />}
              placeholder="Tìm theo tên hoặc mã phòng..."
              style={{ width: '100%' }}
              value={searchText}
              onChange={(e) => {
                const value = e.target.value;
                setSearchText(value);
                if (!value) handleSearch('');
              }}
              onSearch={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={10}>
            <Segmented
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as string)}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: '🟢 Hoạt động' },
                { value: 'INACTIVE', label: '🔴 Bảo trì' },
              ]}
            />
          </Col>
        </Row>

        {/* View Mode: Card Grid */}
        {viewMode === 'card' ? (
          <Row gutter={[16, 16]}>
            {displayedRooms.map((room) => {
              const compCount = room.computers?.length || 0;
              const seats = room.totalSeats || 30;
              const usagePercent = Math.min(Math.round((compCount / seats) * 100), 100);

              return (
                <Col xs={24} sm={12} md={8} lg={6} key={room.id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 12,
                      borderLeft: `4px solid ${room.isActive ? '#52c41a' : '#ff4d4f'}`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      position: 'relative'
                    }}
                    actions={[
                      <Tooltip title="Chỉnh sửa">
                        <EditOutlined key="edit" onClick={() => showEditModal(room)} style={{ color: '#1677ff' }} />
                      </Tooltip>,
                      <Popconfirm
                        title="Xóa phòng máy này?"
                        onConfirm={() => handleDelete(room.id)}
                        okText="Có"
                        cancelText="Không"
                      >
                        <Tooltip title="Xóa phòng">
                          <DeleteOutlined key="delete" style={{ color: '#ff4d4f' }} />
                        </Tooltip>
                      </Popconfirm>
                    ]}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <Tag color="blue" style={{ fontWeight: 600, marginBottom: 4 }}>
                          {room.roomCode}
                        </Tag>
                        <Title level={5} style={{ margin: 0, color: '#1677ff' }}>
                          {room.roomName}
                        </Title>
                      </div>
                      <Tag color={room.isActive ? 'success' : 'error'} style={{ marginLeft: 'auto' }}>
                        {room.isActive ? 'Hoạt động' : 'Bảo trì'}
                      </Tag>
                    </div>

                    <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        <EnvironmentOutlined style={{ marginRight: 4 }} /> {room.location || 'Khu nhà Lab'}
                      </Text>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                        <span>Sức chứa: <b>{seats} ghế</b></span>
                        <span style={{ color: '#1677ff' }}>Máy tính: <b>{compCount} máy</b></span>
                      </div>
                      <Progress
                        percent={usagePercent}
                        size="small"
                        status={room.isActive ? 'active' : 'exception'}
                        strokeColor={room.isActive ? '#1677ff' : '#ff4d4f'}
                      />
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        ) : (
          /* View Mode: Table */
          <Table
            columns={columns}
            dataSource={displayedRooms}
            rowKey="id"
            loading={loading}
            scroll={{ x: 900 }}
            pagination={{
              current: page + 1,
              pageSize: size,
              total,
              onChange: (p, s) => {
                setPage(p - 1);
                setSize(s);
              },
            }}
          />
        )}

        {/* Modal Thêm / Chỉnh sửa phòng máy */}
        <Modal
          title={
            <span>
              <DesktopOutlined style={{ color: '#1677ff', marginRight: 8 }} />
              {editingRoom ? "Chỉnh sửa thông tin phòng máy" : "Thêm phòng máy mới"}
            </span>
          }
          open={isModalOpen}
          onOk={handleOk}
          onCancel={() => setIsModalOpen(false)}
          okText="Lưu lại"
          cancelText="Hủy"
          width={540}
        >
          <Form form={form} layout="vertical" initialValues={{ isActive: true, totalSeats: 30 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="roomCode" label="Mã phòng máy" rules={[{ required: true, message: 'Nhập mã phòng!' }]}>
                  <Input placeholder="Ví dụ: LAB-101" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="roomName" label="Tên phòng máy" rules={[{ required: true, message: 'Nhập tên phòng!' }]}>
                  <Input placeholder="Ví dụ: Phòng Lab 101" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="location" label="Vị trí (Tòa nhà / Tầng)" rules={[{ required: true, message: 'Nhập vị trí!' }]}>
              <Input placeholder="Ví dụ: Tầng 2 - Nhà A1" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="totalSeats" label="Số lượng ghế ngồi" rules={[{ required: true, message: 'Nhập số ghế!' }]}>
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="30" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="isActive" label="Trạng thái phòng" valuePropName="checked">
                  <Switch checkedChildren="Hoạt động" unCheckedChildren="Bảo trì" defaultChecked />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default RoomManagement;
