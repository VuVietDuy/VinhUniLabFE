import React, { useEffect, useState } from 'react';
import {
  AlertOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SyncOutlined,
  EnvironmentOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
  message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Row,
  Col,
  Statistic,
  Input,
  Modal,
  Descriptions,
  Badge,
  Typography
} from 'antd';
import { incidentApi, type Incident, type IncidentStatus, type Priority } from '../../api/incident';
import { exportIncidentsToExcel } from '../../utils/excelParser';
import { getApiErrorMessage } from '../../utils/apiError';

const { Text } = Typography;

const priorityMap: Record<Priority, { color: string; label: string }> = {
  LOW: { color: 'blue', label: 'Thấp (Nhẹ)' },
  NORMAL: { color: 'orange', label: 'Trung bình' },
  HIGH: { color: 'red', label: '🔴 Khẩn cấp' },
};

const statusOptions: { value: IncidentStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'OPEN', label: 'Mới tiếp nhận', color: 'volcano', icon: <AlertOutlined /> },
  { value: 'IN_PROGRESS', label: 'Đang sửa chữa', color: 'processing', icon: <SyncOutlined spin /> },
  { value: 'RESOLVED', label: 'Đã khắc phục', color: 'success', icon: <CheckCircleOutlined /> },
];

const getComputerCode = (record: Incident) => {
  const computer = record as Incident & { computer?: { computerCode?: string } };
  return computer.computer?.computerCode || '-';
};

const getRoomName = (record: Incident) => {
  const computer = record as Incident & { computer?: { roomName?: string; room?: { roomName?: string } } };
  return computer.computer?.roomName || computer.computer?.room?.roomName || record.roomName || '-';
};

const AssignedIncidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [exporting, setExporting] = useState(false);

  // Detail Modal
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchAssignedIncidents = async (page = 1) => {
    setLoading(true);
    try {
      const res = await incidentApi.getAssignedToMe(page - 1, pagination.pageSize);
      setIncidents(res.data.content);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: res.data.totalElements,
      }));
    } catch {
      message.error('Không thể tải danh sách sự cố được gán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedIncidents();
  }, []);

  const handleStatusChange = async (id: number, status: IncidentStatus) => {
    try {
      await incidentApi.updateStatus(id, status);
      message.success('Đã cập nhật trạng thái sự cố');
      fetchAssignedIncidents(pagination.current);
    } catch {
      message.error('Cập nhật trạng thái thất bại');
    }
  };

  const handleViewDetail = (record: Incident) => {
    setSelectedIncident(record);
    setIsDetailModalOpen(true);
  };

  // Xuất Excel sự cố được phân công
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await incidentApi.getAssignedToMe(0, 1000);
      let list = res.data.content || [];
      if (list.length === 0) {
        message.warning('Không có dữ liệu sự cố nào để xuất Excel');
        return;
      }
      if (statusFilter !== 'ALL') {
        list = list.filter(item => item.status === statusFilter);
      }
      if (priorityFilter !== 'ALL') {
        list = list.filter(item => item.priority === priorityFilter);
      }
      if (searchText.trim()) {
        const kw = searchText.toLowerCase().trim();
        list = list.filter(item => {
          const descMatch = item.description?.toLowerCase().includes(kw);
          const comp = item as Incident & { computer?: { computerCode?: string; roomName?: string; room?: { roomName?: string } } };
          const codeMatch = comp.computer?.computerCode?.toLowerCase().includes(kw);
          const roomMatch = (comp.computer?.roomName || comp.computer?.room?.roomName || item.roomName || '').toLowerCase().includes(kw);
          return descMatch || codeMatch || roomMatch;
        });
      }
      if (list.length === 0) {
        message.warning('Không tìm thấy sự cố nào phù hợp với bộ lọc hiện tại để xuất Excel');
        return;
      }
      exportIncidentsToExcel(list, [], 'Danh_Sach_Su_Co_Phan_Cong.xlsx');
      message.success(`Đã xuất ${list.length} sự cố ra file Excel thành công!`);
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Xuất danh sách sự cố thất bại'));
    } finally {
      setExporting(false);
    }
  };

  // Client side filtering for keyword & status/priority
  const filteredIncidents = incidents.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
    if (searchText.trim()) {
      const kw = searchText.toLowerCase().trim();
      const code = getComputerCode(item).toLowerCase();
      const room = getRoomName(item).toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return code.includes(kw) || room.includes(kw) || desc.includes(kw);
    }
    return true;
  });

  // Calculate Metrics
  const openCount = incidents.filter(i => i.status === 'OPEN').length;
  const inProgressCount = incidents.filter(i => i.status === 'IN_PROGRESS').length;
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED').length;

  const columns: ColumnsType<Incident> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_v, _r, idx) => ((pagination.current - 1) * pagination.pageSize) + idx + 1,
    },
    {
      title: 'Mức độ',
      dataIndex: 'priority',
      key: 'priority',
      width: 130,
      render: (priority: Priority) => {
        const item = priorityMap[priority] || priorityMap.NORMAL;
        return (
          <Tag color={item.color} style={{ fontWeight: 600 }}>
            {item.label}
          </Tag>
        );
      },
    },
    {
      title: 'Phòng & Máy tính',
      key: 'computerCode',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#1890ff' }}>
            <DesktopOutlined /> {getComputerCode(record)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <EnvironmentOutlined /> {getRoomName(record)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Nội dung sự cố',
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
      dataIndex: 'reportedBy',
      key: 'reportedBy',
      render: (reportedBy: { fullName?: string } | string) => (
        <Space>
          <UserOutlined style={{ color: '#8c8c8c' }} />
          <span>{typeof reportedBy === 'string' ? reportedBy : reportedBy?.fullName || '-'}</span>
        </Space>
      ),
    },
    {
      title: 'Ngày báo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          <span>{d ? new Date(d).toLocaleDateString('vi-VN') : '-'}</span>
        </Space>
      ),
    },
    {
      title: 'Trạng thái xử lý',
      dataIndex: 'status',
      key: 'status',
      width: 165,
      render: (status: IncidentStatus, record) => (
        <Select
          value={status}
          style={{ width: 150 }}
          onChange={value => handleStatusChange(record.id, value)}
          options={statusOptions.map(option => ({
            value: option.value,
            label: <Tag color={option.color}>{option.label}</Tag>,
          }))}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>

          {record.status === 'OPEN' && (
            <Button
              type="primary"
              size="small"
              icon={<ToolOutlined />}
              style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
              onClick={() => handleStatusChange(record.id, 'IN_PROGRESS')}
            >
              Sửa máy
            </Button>
          )}

          {record.status === 'IN_PROGRESS' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => handleStatusChange(record.id, 'RESOLVED')}
            >
              Hoàn thành
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Top Banner KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng công việc được giao"
              value={incidents.length}
              prefix={<ToolOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Mới giao (Chờ sửa)"
              value={openCount}
              valueStyle={{ color: '#ff4d4f', fontWeight: 600 }}
              prefix={<Badge status="error" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đang sửa chữa"
              value={inProgressCount}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<SyncOutlined spin />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
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
            <AlertOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
            Danh sách Báo cáo Sự cố được phân công (Kỹ thuật viên)
          </span>
        }
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => fetchAssignedIncidents(pagination.current)}>
              Làm mới
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportExcel}
              loading={exporting}
              style={{ color: '#fa8c16', borderColor: '#fa8c16', fontWeight: 600 }}
            >
              Export Excel
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
              placeholder="Tìm theo tên máy, phòng, mô tả lỗi..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={7}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'OPEN', label: '🔴 Mới tiếp nhận' },
                { value: 'IN_PROGRESS', label: '🔵 Đang sửa chữa' },
                { value: 'RESOLVED', label: '🟢 Đã khắc phục' },
              ]}
            />
          </Col>
          <Col xs={12} sm={7}>
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
          dataSource={filteredIncidents}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            ...pagination,
            onChange: page => fetchAssignedIncidents(page),
          }}
        />

        {/* Modal xem chi tiết công việc */}
        <Modal
          title={
            <span>
              <ToolOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
              Chi tiết công việc sửa chữa #{selectedIncident?.id}
            </span>
          }
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
              Đóng
            </Button>
          ]}
          width={600}
        >
          {selectedIncident && (
            <Descriptions bordered column={1} size="small" style={{ marginTop: 12 }}>
              <Descriptions.Item label="Mức độ nghiêm trọng">
                {(() => {
                  const p = priorityMap[selectedIncident.priority] || priorityMap.NORMAL;
                  return <Tag color={p.color}>{p.label}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái hiện tại">
                {(() => {
                  const st = statusOptions.find(o => o.value === selectedIncident.status);
                  return <Tag color={st?.color || 'default'}>{st?.label || selectedIncident.status}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Phòng máy">
                {getRoomName(selectedIncident)}
              </Descriptions.Item>
              <Descriptions.Item label="Mã máy tính lỗi">
                <b>{getComputerCode(selectedIncident)}</b>
              </Descriptions.Item>
              <Descriptions.Item label="Người báo sự cố">
                {typeof selectedIncident.reportedBy === 'string'
                  ? selectedIncident.reportedBy
                  : selectedIncident.reportedBy?.fullName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian báo cáo">
                {selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleString('vi-VN') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Nội dung mô tả sự cố">
                {selectedIncident.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian hoàn thành">
                {selectedIncident.resolvedAt ? new Date(selectedIncident.resolvedAt).toLocaleString('vi-VN') : 'Chưa khắc phục'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default AssignedIncidents;
