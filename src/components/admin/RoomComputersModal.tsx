import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Row,
  Col,
  Card,
  Statistic,
  Tooltip,
  Popconfirm,
  message,
  Typography,
  Form,
  Empty
} from 'antd';
import {
  DesktopOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EnvironmentOutlined,
  UserOutlined,
  DownloadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { computerApi, type Computer, type ComputerStatus } from '../../api/computer';
import type { Room } from '../../api/room';
import { getApiErrorMessage, isFormValidationError } from '../../utils/apiError';
import { exportComputersToExcel } from '../../utils/excelParser';

const { Text } = Typography;

export const statusMap: Record<ComputerStatus, { color: string; label: string; icon: React.ReactNode }> = {
  AVAILABLE: { color: 'success', label: 'Sẵn sàng', icon: <CheckCircleOutlined /> },
  IN_USE: { color: 'processing', label: 'Đang sử dụng', icon: <SyncOutlined spin /> },
  MAINTENANCE: { color: 'warning', label: 'Đang bảo trì', icon: <ToolOutlined /> },
  BROKEN: { color: 'error', label: 'Bị hỏng', icon: <CloseCircleOutlined /> },
};

interface RoomComputersModalProps {
  open: boolean;
  room: Room | null;
  onClose: () => void;
  onRefreshRoom?: () => void;
}

export const RoomComputersModal: React.FC<RoomComputersModalProps> = ({
  open,
  room,
  onClose,
  onRefreshRoom
}) => {
  const [computers, setComputers] = useState<Computer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingComputer, setEditingComputer] = useState<Computer | null>(null);
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm();

  // Tải danh sách máy tính của phòng
  const fetchRoomComputers = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const res = await computerApi.search({
        filter: 'id!=0',
        page: 0,
        size: 500,
        sort: ['computerCode,asc']
      });
      const allComputers: Computer[] = res.data.content || [];
      const roomComps = allComputers.filter(
        c => c.roomId === room.id || c.room?.id === room.id
      );
      setComputers(roomComps);
    } catch {
      // Fallback lấy từ room.computers nếu có
      if (room.computers) {
        setComputers(room.computers);
      } else {
        message.error('Không thể tải danh sách máy tính của phòng này');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && room) {
      setSearchText('');
      setStatusFilter('ALL');
      fetchRoomComputers();
    }
  }, [open, room?.id]);

  // Cập nhật trạng thái nhanh
  const handleQuickStatusChange = async (id: number, newStatus: ComputerStatus) => {
    try {
      await computerApi.update(id, { status: newStatus });
      message.success('Đã cập nhật trạng thái máy tính');
      fetchRoomComputers();
      onRefreshRoom?.();
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'));
    }
  };

  // Mở modal thêm máy mới vào phòng hiện tại
  const handleOpenAdd = () => {
    if (!room) return;
    setEditingComputer(null);
    form.resetFields();
    form.setFieldsValue({
      roomId: room.id,
      status: 'AVAILABLE'
    });
    setIsEditModalOpen(true);
  };

  // Mở modal chỉnh sửa máy tính
  const handleOpenEdit = (comp: Computer) => {
    setEditingComputer(comp);
    form.setFieldsValue({
      computerCode: comp.computerCode,
      status: comp.status,
      specs: comp.specs,
      roomId: room?.id
    });
    setIsEditModalOpen(true);
  };

  // Lưu máy tính (Thêm / Sửa)
  const handleSaveComputer = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<Computer> = {
        ...values,
        roomId: room?.id
      };

      if (editingComputer) {
        await computerApi.update(editingComputer.id, payload);
        message.success('Cập nhật máy tính thành công');
      } else {
        await computerApi.create(payload);
        message.success('Thêm máy tính mới vào phòng thành công');
      }
      setIsEditModalOpen(false);
      fetchRoomComputers();
      onRefreshRoom?.();
    } catch (error) {
      if (isFormValidationError(error)) return;
      message.error(getApiErrorMessage(error, 'Lưu thông tin máy tính thất bại'));
    }
  };

  // Xóa máy tính
  const handleDeleteComputer = async (id: number) => {
    try {
      await computerApi.delete(id);
      message.success('Đã xóa máy tính khỏi phòng');
      fetchRoomComputers();
      onRefreshRoom?.();
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Xóa máy tính thất bại'));
    }
  };

  // Xuất Excel danh sách máy trong phòng này
  const handleExportExcel = () => {
    if (computers.length === 0) {
      message.warning('Phòng này hiện chưa có máy tính nào để xuất Excel');
      return;
    }
    setExporting(true);
    try {
      const filename = `Danh_Sach_May_Tinh_${room?.roomCode || 'Phong'}.xlsx`;
      exportComputersToExcel(computers, room ? [room] : [], filename);
      message.success(`Đã xuất ${computers.length} máy tính ra file Excel thành công!`);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Xuất file Excel thất bại'));
    } finally {
      setExporting(false);
    }
  };

  // Lọc danh sách máy
  const filteredComputers = computers.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchText.trim()) {
      const kw = searchText.toLowerCase().trim();
      const code = (c.computerCode || '').toLowerCase();
      const specs = (c.specs || '').toLowerCase();
      return code.includes(kw) || specs.includes(kw);
    }
    return true;
  });

  // Metrics
  const totalCount = computers.length;
  const availableCount = computers.filter(c => c.status === 'AVAILABLE').length;
  const inUseCount = computers.filter(c => c.status === 'IN_USE').length;
  const maintenanceCount = computers.filter(c => c.status === 'MAINTENANCE').length;
  const brokenCount = computers.filter(c => c.status === 'BROKEN').length;

  const columns: ColumnsType<Computer> = [
    {
      title: 'STT',
      key: 'index',
      width: 55,
      render: (_value, _record, index) => index + 1,
    },
    {
      title: 'Mã máy',
      dataIndex: 'computerCode',
      key: 'computerCode',
      width: 140,
      render: (code: string) => (
        <span style={{ fontWeight: 600, color: '#1677ff' }}>
          <DesktopOutlined style={{ marginRight: 6 }} />
          {code}
        </span>
      ),
    },
    {
      title: 'Cấu hình / Thông số máy',
      dataIndex: 'specs',
      key: 'specs',
      render: (specs: string) => (
        <Text type={specs ? undefined : 'secondary'} style={{ fontSize: 13 }}>
          {specs || 'Chưa cập nhật thông số'}
        </Text>
      ),
    },
    {
      title: 'Trạng thái hoạt động',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (status: ComputerStatus, record) => (
        <Select
          value={status}
          style={{ width: 145 }}
          size="small"
          onChange={(newStatus) => handleQuickStatusChange(record.id, newStatus)}
          options={Object.entries(statusMap).map(([key, item]) => ({
            value: key,
            label: (
              <Tag color={item.color} style={{ margin: 0 }}>
                {item.icon} {item.label}
              </Tag>
            ),
          }))}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa thông tin máy">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1677ff' }} />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa máy tính này?"
            description="Bạn có chắc chắn muốn xóa máy tính khỏi phòng?"
            onConfirm={() => handleDeleteComputer(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Tooltip title="Xóa máy tính">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!room) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={900}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <Space align="center">
            <DesktopOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            <div>
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                Danh sách máy tính - {room.roomName} ({room.roomCode})
              </span>
              <div style={{ fontSize: 13, fontWeight: 400, color: '#8c8c8c', marginTop: 2 }}>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {room.location || 'Khu nhà Lab'} • Sức chứa: {room.totalSeats || 0} ghế
                {room.technician && (
                  <span style={{ marginLeft: 10, color: '#2f54eb' }}>
                    <UserOutlined style={{ marginRight: 4 }} />
                    KTV: {room.technician.fullName || room.technician.username}
                  </span>
                )}
              </div>
            </div>
          </Space>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      style={{ top: 20 }}
    >
      {/* Top Banner KPI Counts for this room */}
      <Row gutter={[12, 12]} style={{ marginTop: 12, marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#fafafa' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Tổng số máy</span>}
              value={totalCount}
              valueStyle={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}
              prefix={<DesktopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ borderRadius: 8, background: '#f6ffed' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Sẵn sàng</span>}
              value={availableCount}
              valueStyle={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ borderRadius: 8, background: '#e6f7ff' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Đang dùng</span>}
              value={inUseCount}
              valueStyle={{ fontSize: 18, fontWeight: 700, color: '#1890ff' }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ borderRadius: 8, background: '#fffbe6' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Bảo trì</span>}
              value={maintenanceCount}
              valueStyle={{ fontSize: 18, fontWeight: 700, color: '#faad14' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ borderRadius: 8, background: '#fff1f0' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Bị hỏng</span>}
              value={brokenCount}
              valueStyle={{ fontSize: 18, fontWeight: 700, color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Action & Filter Toolbar */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={10}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
            placeholder="Tìm theo mã máy, cấu hình..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Select
            style={{ width: '100%' }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'AVAILABLE', label: '🟢 Sẵn sàng' },
              { value: 'IN_USE', label: '🔵 Đang sử dụng' },
              { value: 'MAINTENANCE', label: '🟠 Đang bảo trì' },
              { value: 'BROKEN', label: '🔴 Bị hỏng' },
            ]}
          />
        </Col>
        <Col xs={12} sm={8} style={{ textAlign: 'right' }}>
          <Space>
            <Button
              icon={viewMode === 'table' ? <AppstoreOutlined /> : <UnorderedListOutlined />}
              onClick={() => setViewMode(v => (v === 'table' ? 'grid' : 'table'))}
            >
              {viewMode === 'table' ? 'Lưới' : 'Bảng'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchRoomComputers} loading={loading} />
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportExcel}
              loading={exporting}
              title="Xuất Excel danh sách máy phòng này"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAdd}
              style={{ fontWeight: 600 }}
            >
              Thêm máy
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Data View: Table or Grid */}
      {viewMode === 'table' ? (
        <Table
          columns={columns}
          dataSource={filteredComputers}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 8, showTotal: (tot) => `Tổng số: ${tot} máy tính` }}
          style={{ minHeight: 320 }}
        />
      ) : (
        /* Grid Mode: Interactive Computer Layout */
        <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4, minHeight: 200 }}>
          {filteredComputers.length === 0 ? (
            <Empty description="Không tìm thấy máy tính nào trong phòng này" style={{ marginTop: 40 }} />
          ) : (
            <Row gutter={[12, 12]}>
              {filteredComputers.map((comp) => {
                const st = statusMap[comp.status] || statusMap.AVAILABLE;
                return (
                  <Col xs={12} sm={8} md={6} key={comp.id}>
                    <Card
                      size="small"
                      hoverable
                      style={{
                        borderRadius: 8,
                        borderLeft: `3px solid ${
                          comp.status === 'AVAILABLE'
                            ? '#52c41a'
                            : comp.status === 'IN_USE'
                            ? '#1890ff'
                            : comp.status === 'MAINTENANCE'
                            ? '#faad14'
                            : '#ff4d4f'
                        }`,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                        position: 'relative',
                      }}
                      actions={[
                        <Tooltip title="Sửa">
                          <EditOutlined key="edit" onClick={() => handleOpenEdit(comp)} style={{ color: '#1677ff' }} />
                        </Tooltip>,
                        <Popconfirm
                          title="Xóa máy tính này?"
                          onConfirm={() => handleDeleteComputer(comp.id)}
                          okText="Có"
                          cancelText="Không"
                        >
                          <Tooltip title="Xóa">
                            <DeleteOutlined key="delete" style={{ color: '#ff4d4f' }} />
                          </Tooltip>
                        </Popconfirm>,
                      ]}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#1677ff', fontSize: 14 }}>
                          <DesktopOutlined style={{ marginRight: 4 }} />
                          {comp.computerCode}
                        </span>
                      </div>
                      <Tag color={st.color} style={{ fontSize: 11, padding: '0 6px', margin: '2px 0 6px 0' }}>
                        {st.icon} {st.label}
                      </Tag>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#595959',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={comp.specs || 'Chưa có cấu hình'}
                      >
                        {comp.specs || 'Chưa cập nhật thông số'}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      )}

      {/* Modal Thêm / Chỉnh sửa Máy tính con */}
      <Modal
        title={editingComputer ? `Chỉnh sửa máy tính [${editingComputer.computerCode}]` : `Thêm máy tính mới vào ${room.roomName}`}
        open={isEditModalOpen}
        onOk={handleSaveComputer}
        onCancel={() => setIsEditModalOpen(false)}
        okText="Lưu lại"
        cancelText="Hủy"
        width={480}
      >
        <Form form={form} layout="vertical" initialValues={{ status: 'AVAILABLE' }} style={{ marginTop: 16 }}>
          <Form.Item
            name="computerCode"
            label="Mã máy tính"
            rules={[{ required: true, message: 'Vui lòng nhập mã máy tính!' }]}
          >
            <Input placeholder="Ví dụ: PC-01, LAB101-PC01..." prefix={<DesktopOutlined />} />
          </Form.Item>

          <Form.Item name="status" label="Trạng thái" rules={[{ required: true, message: 'Chọn trạng thái!' }]}>
            <Select
              options={Object.entries(statusMap).map(([key, item]) => ({
                value: key,
                label: (
                  <Tag color={item.color}>
                    {item.icon} {item.label}
                  </Tag>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item name="specs" label="Cấu hình / Thông số máy">
            <Input.TextArea
              rows={3}
              placeholder="Ví dụ: Core i5-12400, RAM 16GB, SSD 512GB, Màn hình Dell 24 inch..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};
