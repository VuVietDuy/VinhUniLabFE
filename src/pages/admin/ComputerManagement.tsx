import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Card,
  Tag,
  Row,
  Col,
  Statistic,
  Tooltip,
  Typography,
  Badge,
  Segmented,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DesktopOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EnvironmentOutlined,
  UnorderedListOutlined,
  FolderOpenOutlined,
  FileExcelOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { computerApi, type Computer, type ComputerStatus } from '../../api/computer';
import { roomApi, type Room } from '../../api/room';
import { getApiErrorMessage, isFormValidationError } from '../../utils/apiError';
import { ComputerImportModal } from '../../components/admin/ComputerImportModal';
import { exportComputersToExcel } from '../../utils/excelParser';

const { Text } = Typography;

export const statusMap: Record<ComputerStatus, { color: string; label: string; icon: React.ReactNode }> = {
  AVAILABLE: { color: 'success', label: 'Sẵn sàng', icon: <CheckCircleOutlined /> },
  IN_USE: { color: 'processing', label: 'Đang sử dụng', icon: <SyncOutlined spin /> },
  MAINTENANCE: { color: 'warning', label: 'Đang bảo trì', icon: <ToolOutlined /> },
  BROKEN: { color: 'error', label: 'Bị hỏng', icon: <CloseCircleOutlined /> },
};

const ComputerManagement: React.FC = () => {
  const [computers, setComputers] = useState<Computer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingComputer, setEditingComputer] = useState<Computer | null>(null);

  // Pagination & Filtering & Grouping
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);
  const [displayMode, setDisplayMode] = useState<'flat' | 'grouped'>('flat');

  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, roomRes] = await Promise.all([
        computerApi.search({ filter: 'id!=0', page: 0, size: 500, sort: ['id,desc'] }),
        roomApi.getAll()
      ]);
      setComputers(compRes.data.content);
      setTotal(compRes.data.totalElements);
      setRooms(roomRes.data);
    } catch {
      message.error('Lỗi khi tải dữ liệu máy tính');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Hàm xuất danh sách máy tính ra file Excel
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await computerApi.getAll();
      const allComps = response.data;
      if (!allComps || allComps.length === 0) {
        message.warning('Không tìm thấy dữ liệu máy tính nào để xuất Excel');
        return;
      }
      exportComputersToExcel(allComps, rooms);
      message.success(`Đã xuất ${allComps.length} máy tính ra file Excel thành công!`);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Xuất danh sách máy tính thất bại'));
    } finally {
      setExporting(false);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      values.room = { id: values.roomId };
      if (editingComputer) {
        await computerApi.update(editingComputer.id, values);
        message.success('Cập nhật máy tính thành công');
      } else {
        await computerApi.create(values);
        message.success('Thêm máy tính mới thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      if (isFormValidationError(error)) return;
      message.error(getApiErrorMessage(error, 'Lưu thông tin máy tính thất bại'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await computerApi.delete(id);
      message.success('Đã xóa máy tính thành công');
      fetchData();
    } catch {
      message.error('Xóa máy tính thất bại');
    }
  };

  const openAddModalForRoom = (targetRoomId?: number) => {
    setEditingComputer(null);
    form.resetFields();
    if (targetRoomId) {
      form.setFieldsValue({ roomId: targetRoomId, status: 'AVAILABLE' });
    } else if (rooms.length > 0) {
      form.setFieldsValue({ roomId: rooms[0].id, status: 'AVAILABLE' });
    }
    setIsModalOpen(true);
  };

  const openEditModal = (comp: Computer) => {
    setEditingComputer(comp);
    form.setFieldsValue({
      ...comp,
      roomId: comp.roomId || comp.room?.id
    });
    setIsModalOpen(true);
  };

  // Client-side filtering
  const filteredComputers = computers.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (selectedRoomId && (item.roomId !== selectedRoomId && item.room?.id !== selectedRoomId)) return false;
    if (searchText.trim()) {
      const kw = searchText.toLowerCase().trim();
      const code = (item.computerCode || '').toLowerCase();
      const specs = (item.specs || '').toLowerCase();
      return code.includes(kw) || specs.includes(kw);
    }
    return true;
  });

  // Calculate Metrics
  const availableCount = computers.filter(c => c.status === 'AVAILABLE').length;
  const inUseCount = computers.filter(c => c.status === 'IN_USE').length;
  const maintenanceCount = computers.filter(c => c.status === 'MAINTENANCE' || c.status === 'BROKEN').length;

  // Group computers by Room ID
  const groupedRoomsData = rooms.map(room => {
    const roomComps = filteredComputers.filter(c => (c.roomId === room.id || c.room?.id === room.id));
    return {
      room,
      computers: roomComps
    };
  }).filter(group => {
    // If filtering by room, only show selected room
    if (selectedRoomId && group.room.id !== selectedRoomId) return false;
    return true;
  });

  const columns: ColumnsType<Computer> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_value, _record, index) => (page * size) + index + 1,
    },
    {
      title: 'Mã máy tính',
      dataIndex: 'computerCode',
      key: 'computerCode',
      render: (text: string) => (
        <Space>
          <DesktopOutlined style={{ color: '#1677ff' }} />
          <Text strong style={{ color: '#1677ff' }}>{text || 'PC-UNNAMED'}</Text>
        </Space>
      ),
    },
    {
      title: 'Thuộc phòng máy',
      key: 'roomId',
      render: (_, record) => {
        const room = rooms.find(r => r.id === (record.roomId || record.room?.id));
        return (
          <Space>
            <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
            <span>{room ? room.roomName : `ID Phòng: ${record.roomId}`}</span>
          </Space>
        );
      }
    },
    {
      title: 'Cấu hình phần cứng',
      dataIndex: 'specs',
      key: 'specs',
      ellipsis: true,
      render: (specs: string) => (
        <Tooltip title={specs}>
          <span>{specs || 'Core i5 / RAM 16GB / SSD 256GB'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: ComputerStatus) => {
        const item = statusMap[status] || statusMap.AVAILABLE;
        return <Tag color={item.color} icon={item.icon}>{item.label}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa">
            <Button
              icon={<EditOutlined />}
              type="text"
              style={{ color: '#1677ff' }}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa máy tính này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa máy">
              <Button icon={<DeleteOutlined />} type="text" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Top Metric Cards Banner */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng số máy tính"
              value={total || computers.length}
              prefix={<DesktopOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Sẵn sàng hoạt động"
              value={availableCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đang được sử dụng"
              value={inUseCount}
              valueStyle={{ color: '#1677ff' }}
              prefix={<SyncOutlined spin />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Bảo trì / Hỏng"
              value={maintenanceCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<Badge status="error" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card
        title={
          <span>
            <DesktopOutlined style={{ color: '#1677ff', marginRight: 8 }} />
            Quản lý Danh sách Máy tính VinhUniLab
          </span>
        }
        extra={
          <Space wrap>
            <Segmented
              value={displayMode}
              onChange={(val) => setDisplayMode(val as 'flat' | 'grouped')}
              options={[
                { value: 'flat', label: 'Bảng tổng hợp', icon: <UnorderedListOutlined /> },
                { value: 'grouped', label: 'Gom nhóm theo phòng', icon: <FolderOpenOutlined /> },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
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
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openAddModalForRoom()}
              style={{ fontWeight: 600 }}
            >
              Thêm máy tính
            </Button>
          </Space>
        }
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {/* Search & Filter Bar */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={10}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tìm theo mã máy, cấu hình phần cứng..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={7}>
            <Select
              style={{ width: '100%' }}
              placeholder="Lọc theo phòng máy"
              allowClear
              value={selectedRoomId}
              onChange={setSelectedRoomId}
              options={rooms.map(r => ({ value: r.id, label: r.roomName }))}
            />
          </Col>
          <Col xs={12} sm={7}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'AVAILABLE', label: '🟢 Sẵn sàng' },
                { value: 'IN_USE', label: '🔵 Đang sử dụng' },
                { value: 'MAINTENANCE', label: '🟠 Bảo trì' },
                { value: 'BROKEN', label: '🔴 Hỏng' },
              ]}
            />
          </Col>
        </Row>

        {/* Display Mode Switch: Grouped by Room vs Flat Table */}
        {displayMode === 'grouped' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {groupedRoomsData.map(({ room, computers: roomComps }) => (
              <Card
                key={room.id}
                size="small"
                style={{
                  borderRadius: 10,
                  border: '1px solid #e8e8e8',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
                title={
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space align="center">
                      <FolderOpenOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                      <Text strong style={{ fontSize: 16, color: '#1677ff' }}>
                        {room.roomName} ({room.roomCode})
                      </Text>
                      <Tag color="blue"><EnvironmentOutlined /> {room.location || 'Khu Lab'}</Tag>
                      <Tag color="cyan">{roomComps.length} máy tính</Tag>
                    </Space>
                    <Button
                      size="small"
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => openAddModalForRoom(room.id)}
                    >
                      Thêm máy vào phòng này
                    </Button>
                  </Space>
                }
              >
                {roomComps.length === 0 ? (
                  <Text type="secondary" style={{ fontStyle: 'italic', padding: '12px 0', display: 'block' }}>
                    Chưa có máy tính nào trong phòng này hoặc bị ẩn bởi bộ lọc.
                  </Text>
                ) : (
                  <Row gutter={[12, 12]}>
                    {roomComps.map(comp => {
                      const statusInfo = statusMap[comp.status] || statusMap.AVAILABLE;
                      return (
                        <Col xs={24} sm={12} md={8} lg={6} xl={4} key={comp.id}>
                          <Card
                            hoverable
                            size="small"
                            style={{
                              borderRadius: 8,
                              borderColor: '#e8e8e8',
                              textAlign: 'center',
                              backgroundColor: '#fafafa',
                              position: 'relative'
                            }}
                          >
                            <DesktopOutlined style={{ fontSize: 28, color: '#1677ff', marginBottom: 6 }} />
                            <Text strong style={{ display: 'block', fontSize: 14 }}>
                              {comp.computerCode}
                            </Text>
                            <div style={{ marginTop: 4, marginBottom: 8 }}>
                              <Tag color={statusInfo.color} style={{ fontSize: 11 }}>
                                {statusInfo.label}
                              </Tag>
                            </div>

                            {comp.specs && (
                              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }} ellipsis={{ tooltip: comp.specs }}>
                                {comp.specs}
                              </Text>
                            )}

                            <Divider style={{ margin: '8px 0' }} />

                            <Space size="middle">
                              <Tooltip title="Sửa">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<EditOutlined />}
                                  style={{ color: '#1677ff' }}
                                  onClick={() => openEditModal(comp)}
                                />
                              </Tooltip>
                              <Popconfirm title="Xóa máy này?" onConfirm={() => handleDelete(comp.id)}>
                                <Tooltip title="Xóa">
                                  <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                </Tooltip>
                              </Popconfirm>
                            </Space>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredComputers}
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

        {/* Modal Thêm / Chỉnh sửa máy tính */}
        <Modal
          title={
            <span>
              <DesktopOutlined style={{ color: '#1677ff', marginRight: 8 }} />
              {editingComputer ? "Chỉnh sửa thông tin máy tính" : "Thêm máy tính mới"}
            </span>
          }
          open={isModalOpen}
          onOk={handleOk}
          onCancel={() => setIsModalOpen(false)}
          okText="Lưu lại"
          cancelText="Hủy"
          width={540}
        >
          <Form form={form} layout="vertical" initialValues={{ status: 'AVAILABLE' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="computerCode" label="Mã máy tính" rules={[{ required: true, message: 'Nhập mã máy!' }]}>
                  <Input placeholder="Ví dụ: LAB1-PC01" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="roomId" label="Thuộc phòng máy" rules={[{ required: true, message: 'Chọn phòng!' }]}>
                  <Select placeholder="Chọn phòng máy">
                    {rooms.map(room => (
                      <Select.Option key={room.id} value={room.id}>{room.roomName}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="status" label="Trạng thái máy">
              <Select>
                <Select.Option value="AVAILABLE">🟢 Sẵn sàng</Select.Option>
                <Select.Option value="IN_USE">🔵 Đang sử dụng</Select.Option>
                <Select.Option value="MAINTENANCE">🟠 Bảo trì</Select.Option>
                <Select.Option value="BROKEN">🔴 Hỏng</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="specs" label="Cấu hình phần cứng (Specs)">
              <Input.TextArea placeholder="Ví dụ: Intel Core i7-12700, RAM 16GB, SSD 512GB, RTX 3060" rows={3} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal Import danh sách máy tính từ file Excel */}
        <ComputerImportModal
          open={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={fetchData}
          rooms={rooms}
        />
      </Card>
    </div>
  );
};

export default ComputerManagement;
