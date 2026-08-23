import React, { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Select,
  Button,
  Space,
  Card,
  message,
  Popconfirm,
  Tooltip,
  Modal,
  Descriptions,
  Row,
  Col,
  Statistic,
  Input,
  Badge,
  Typography
} from 'antd';
import {
  AlertOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserSwitchOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { incidentApi, type Incident, type IncidentStatus, type Priority } from '../../api/incident';
import { roomApi, type Room } from '../../api/room';
import { userApi, type User } from '../../api/user';
import { exportIncidentsToExcel } from '../../utils/excelParser';
import { getApiErrorMessage } from '../../utils/apiError';

const { Text } = Typography;

const priorityMap: Record<Priority, { color: string; label: string; icon: React.ReactNode }> = {
  LOW: { color: 'blue', label: 'Thấp (Nhẹ)', icon: <InfoIcon /> },
  NORMAL: { color: 'orange', label: 'Trung bình', icon: <ExclamationCircleOutlined /> },
  HIGH: { color: 'red', label: 'Khẩn cấp', icon: <AlertOutlined /> },
};

function InfoIcon() {
  return <ClockCircleOutlined />;
}

const statusOptions: { value: IncidentStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'OPEN', label: 'Mới tiếp nhận', color: 'volcano', icon: <AlertOutlined /> },
  { value: 'IN_PROGRESS', label: 'Đang sửa chữa', color: 'processing', icon: <SyncOutlined spin /> },
  { value: 'RESOLVED', label: 'Đã khắc phục', color: 'success', icon: <CheckCircleOutlined /> },
];

const IncidentManagement: React.FC = () => {
  const [data, setData] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);

  // Filtering & Pagination
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  // Detail Modal
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await roomApi.getAll();
      setRooms(res.data);
    } catch {
      message.error('Không thể tải danh sách phòng');
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await userApi.getAll();
      setTechnicians(res.data.filter(user => user.role === 'TECHNICIAN'));
    } catch {
      message.error('Không thể tải danh sách kỹ thuật viên');
    }
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await incidentApi.search({
        filter: 'id!=0',
        page: page,
        size: size,
        sort: ['id,desc'],
      });
      setData(res.data.content);
      setTotal(res.data.totalElements);
    } catch {
      message.error('Lỗi tải danh sách sự cố');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, size]);

  useEffect(() => {
    fetchRooms();
    fetchTechnicians();
  }, []);

  const handleStatusChange = async (id: number, newStatus: IncidentStatus) => {
    try {
      await incidentApi.updateStatus(id, newStatus);
      message.success('Đã cập nhật trạng thái sự cố');
      fetchIncidents();
    } catch {
      message.error('Cập nhật thất bại');
    }
  };

  const handleAssignTechnician = async (id: number, technicianId: number) => {
    try {
      await incidentApi.assignTechnician(id, technicianId);
      message.success('Đã gán kỹ thuật viên xử lý sự cố thành công');
      fetchIncidents();
    } catch {
      message.error('Gán kỹ thuật viên thất bại');
    }
  };

  const handleViewIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailModalOpen(true);
  };

  // Hàm xuất danh sách báo cáo sự cố ra file Excel
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await incidentApi.search({
        filter: 'id!=0',
        page: 0,
        size: 2000,
        sort: ['id,desc'],
      });
      let exportList = res.data.content || [];
      if (exportList.length === 0) {
        message.warning('Không có dữ liệu sự cố nào để xuất Excel');
        return;
      }

      // Áp dụng bộ lọc hiện tại nếu có
      if (statusFilter !== 'ALL') {
        exportList = exportList.filter(item => item.status === statusFilter);
      }
      if (priorityFilter !== 'ALL') {
        exportList = exportList.filter(item => item.priority === priorityFilter);
      }
      if (selectedRoomId) {
        exportList = exportList.filter(item => item.computer?.roomId === selectedRoomId);
      }
      if (searchText.trim()) {
        const kw = searchText.toLowerCase().trim();
        exportList = exportList.filter(item => {
          const descMatch = item.description?.toLowerCase().includes(kw);
          const codeMatch = item.computer?.computerCode?.toLowerCase().includes(kw);
          const reporterMatch = (item.reportedBy?.fullName || item.reportedBy?.username || '').toLowerCase().includes(kw);
          return descMatch || codeMatch || reporterMatch;
        });
      }

      if (exportList.length === 0) {
        message.warning('Không tìm thấy sự cố nào phù hợp với bộ lọc hiện tại để xuất Excel');
        return;
      }

      exportIncidentsToExcel(exportList, rooms);
      message.success(`Đã xuất ${exportList.length} báo cáo sự cố ra file Excel thành công!`);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Xuất danh sách sự cố thất bại'));
    } finally {
      setExporting(false);
    }
  };

  // Client-side Filtered Data
  const filteredData = data.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
    if (selectedRoomId && item.computer?.roomId !== selectedRoomId) return false;
    if (searchText.trim()) {
      const kw = searchText.toLowerCase().trim();
      const descMatch = item.description?.toLowerCase().includes(kw);
      const codeMatch = item.computer?.computerCode?.toLowerCase().includes(kw);
      const reporterMatch = (item.reportedBy?.fullName || item.reportedBy?.username || '').toLowerCase().includes(kw);
      return descMatch || codeMatch || reporterMatch;
    }
    return true;
  });

  const getRoomName = (incident: Incident) => {
    const room = rooms.find(item => item.id === incident.computer?.roomId);
    return room?.roomName || incident.roomName || '-';
  };

  const openCount = data.filter(i => i.status === 'OPEN').length;
  const inProgressCount = data.filter(i => i.status === 'IN_PROGRESS').length;
  const resolvedCount = data.filter(i => i.status === 'RESOLVED').length;

  const columns: ColumnsType<Incident> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_value, _record, index) => (page * size) + index + 1,
    },
    {
      title: 'Mức độ',
      dataIndex: 'priority',
      key: 'priority',
      width: 130,
      render: (priority: Priority) => {
        const item = priorityMap[priority] || priorityMap.NORMAL;
        return (
          <Tag color={item.color} style={{ fontWeight: 600, padding: '2px 8px' }}>
            {item.icon} {item.label}
          </Tag>
        );
      },
    },
    {
      title: 'Vị trí / Máy',
      key: 'computer',
      render: (_, record) => {
        const roomName = getRoomName(record);
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ color: '#1890ff' }}>
              <DesktopOutlined /> {record.computer?.computerCode || `Máy #${record.computerId}`}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Phòng: {roomName}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Mô tả sự cố',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => (
        <Tooltip title={desc}>
          <span style={{ fontWeight: 500 }}>{desc || 'Không có mô tả'}</span>
        </Tooltip>
      )
    },
    {
      title: 'Người báo cáo',
      key: 'reportedBy',
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ color: '#8c8c8c' }} />
          <span>{record.reportedBy?.fullName || record.reportedBy?.username || 'Giảng viên'}</span>
        </Space>
      )
    },
    {
      title: 'Kỹ thuật viên phụ trách',
      key: 'technician',
      width: 210,
      render: (_, record) => {
        const tech = record.assignedTo || (record as any).technician;
        return (
          <Select
            placeholder="Phân công KTV..."
            value={tech?.id}
            style={{ width: 190 }}
            showSearch
            allowClear
            optionFilterProp="label"
            suffixIcon={<UserSwitchOutlined />}
            onChange={technicianId => handleAssignTechnician(record.id, technicianId)}
            options={technicians.map(t => ({
              value: t.id,
              label: t.fullName || t.username,
            }))}
          />
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status: IncidentStatus, record) => (
        <Select
          value={status}
          style={{ width: 145 }}
          onChange={newStatus => handleStatusChange(record.id, newStatus)}
          options={statusOptions.map(opt => ({
            value: opt.value,
            label: <Tag color={opt.color}>{opt.label}</Tag>,
          }))}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleViewIncident(record)}
            />
          </Tooltip>
          {record.status !== 'RESOLVED' && (
            <Tooltip title="Hoàn thành nhanh">
              <Button
                type="text"
                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                onClick={() => handleStatusChange(record.id, 'RESOLVED')}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Xóa báo cáo này?"
            onConfirm={() => incidentApi.delete(record.id).then(() => {
              message.success('Đã xóa báo cáo sự cố!');
              fetchIncidents();
            })}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Top Banner KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng số sự cố"
              value={total}
              prefix={<AlertOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Mới tiếp nhận (Cần sửa)"
              value={openCount}
              valueStyle={{ color: '#ff4d4f', fontWeight: 600 }}
              prefix={<Badge status="error" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đang sửa chữa"
              value={inProgressCount}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SyncOutlined spin />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đã khắc phục xong"
              value={resolvedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card
        title={
          <span>
            <AlertOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            Quản lý Báo cáo Sự cố Hệ thống Phòng máy
          </span>
        }
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={fetchIncidents}>
              Làm mới
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportExcel}
              loading={exporting}
              style={{ color: '#1677ff', borderColor: '#1677ff', fontWeight: 600 }}
            >
              Export Excel
            </Button>
          </Space>
        }
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {/* Search & Filter Bar */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Input
              allowClear
              placeholder="Tìm theo mô tả lỗi, mã máy, người báo..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Lọc phòng máy"
              allowClear
              value={selectedRoomId}
              onChange={setSelectedRoomId}
              options={rooms.map(r => ({ value: r.id, label: r.roomName }))}
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'OPEN', label: 'Mới tiếp nhận' },
                { value: 'IN_PROGRESS', label: 'Đang sửa chữa' },
                { value: 'RESOLVED', label: 'Đã khắc phục' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Select
              style={{ width: '100%' }}
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: 'ALL', label: 'Tất cả mức độ' },
                { value: 'HIGH', label: '🔴 Khẩn cấp' },
                { value: 'NORMAL', label: '🟠 Trung bình' },
                { value: 'LOW', label: '🔵 Thấp' },
              ]}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
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

        {/* Modal xem chi tiết sự cố */}
        <Modal
          title={
            <span>
              <AlertOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
              Chi tiết sự cố #{selectedIncident?.id}
            </span>
          }
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
              Đóng
            </Button>
          ]}
          width={650}
        >
          {selectedIncident && (
            <Descriptions bordered column={1} size="small" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Mức độ sự cố">
                {(() => {
                  const p = priorityMap[selectedIncident.priority] || priorityMap.NORMAL;
                  return <Tag color={p.color}>{p.label}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {(() => {
                  const st = statusOptions.find(o => o.value === selectedIncident.status);
                  return <Tag color={st?.color || 'default'}>{st?.label || selectedIncident.status}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Phòng & Máy tính">
                <b>{selectedIncident.computer?.computerCode || `Máy #${selectedIncident.computerId}`}</b> (Phòng: {getRoomName(selectedIncident)})
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian báo cáo">
                {selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Kỹ thuật viên phụ trách">
                {selectedIncident.assignedTo?.fullName || (selectedIncident as any).technician?.fullName || 'Chưa phân công'}
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả chi tiết lỗi">
                {selectedIncident.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian khắc phục">
                {selectedIncident.resolvedAt ? new Date(selectedIncident.resolvedAt).toLocaleString() : 'Chưa xử lý'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default IncidentManagement;
