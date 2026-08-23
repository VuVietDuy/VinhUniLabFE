import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import type { ColumnsType } from 'antd/es/table';
import { Card, Col, message, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { incidentApi, type Incident, type IncidentStatus, type Priority } from '../../api/incident';

const { Title, Text } = Typography;

const statusMap: Record<IncidentStatus, { color: string; label: string }> = {
  OPEN: { color: 'magenta', label: 'Mới tiếp nhận' },
  IN_PROGRESS: { color: 'processing', label: 'Đang sửa chữa' },
  RESOLVED: { color: 'success', label: 'Đã khắc phục' },
  CLOSED: { color: 'default', label: 'Đã đóng' },
};

const priorityMap: Record<Priority, { color: string; label: string }> = {
  LOW: { color: 'blue', label: 'Thấp' },
  NORMAL: { color: 'orange', label: 'Trung bình' },
  HIGH: { color: 'red', label: 'Khẩn cấp' },
};

const getComputerCode = (record: Incident) => {
  const computer = record as Incident & { computer?: { computerCode?: string }; computerCode?: string };
  return computer.computer?.computerCode || computer.computerCode || '-';
};

const getRoomName = (record: Incident) => {
  const computer = record as Incident & { computer?: { roomName?: string; room?: { roomName?: string } } };
  return computer.computer?.roomName || computer.computer?.room?.roomName || record.roomName || '-';
};

const TechnicianDashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await incidentApi.getAssignedToMe(0, 100);
      setIncidents(res.data.content);
    } catch (error) {
      message.error('Không thể tải thống kê kỹ thuật viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = useMemo(() => {
    const total = incidents.length;
    const open = incidents.filter(item => item.status === 'OPEN').length;
    const inProgress = incidents.filter(item => item.status === 'IN_PROGRESS').length;
    const resolved = incidents.filter(item => item.status === 'RESOLVED' || item.status === 'CLOSED').length;
    const highPriority = incidents.filter(item => item.priority === 'HIGH').length;

    return { total, open, inProgress, resolved, highPriority };
  }, [incidents]);

  const statusChartData = useMemo(
    () => Object.entries(statusMap)
      .map(([status, meta]) => ({
        type: meta.label,
        value: incidents.filter(item => item.status === status).length,
      }))
      .filter(item => item.value > 0),
    [incidents],
  );

  const priorityChartData = useMemo(
    () => Object.entries(priorityMap).map(([priority, meta]) => ({
      priority: meta.label,
      count: incidents.filter(item => item.priority === priority).length,
    })),
    [incidents],
  );

  const recentIncidents = useMemo(
    () => [...incidents]
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
      .slice(0, 5),
    [incidents],
  );

  const pieConfig = {
    data: statusChartData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.85,
    innerRadius: 0.55,
    label: {
      text: 'value',
      style: {
        fontWeight: 600,
      },
    },
    legend: {
      color: {
        title: false,
        position: 'bottom',
      },
    },
  };

  const columnConfig = {
    data: priorityChartData,
    xField: 'priority',
    yField: 'count',
    colorField: 'priority',
    label: {
      text: 'count',
      position: 'top',
    },
  };

  const columns: ColumnsType<Incident> = [
    {
      title: 'Phòng',
      key: 'room',
      render: (_, record) => getRoomName(record),
    },
    {
      title: 'Mã máy',
      key: 'computerCode',
      render: (_, record) => <strong>{getComputerCode(record)}</strong>,
    },
    {
      title: 'Nội dung',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Mức độ',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: Priority) => (
        <Tag color={priorityMap[priority].color}>{priorityMap[priority].label}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: IncidentStatus) => (
        <Tag color={statusMap[status].color}>{statusMap[status].label}</Tag>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={2} style={{ marginBottom: 0 }}>Thống kê kỹ thuật viên</Title>
        <Text type="secondary">Theo dõi nhanh các sự cố đang được phân công xử lý.</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} loading={loading}>
            <Statistic title="Tổng sự cố được gán" value={stats.total} prefix={<AlertOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} loading={loading}>
            <Statistic
              title="Mới tiếp nhận"
              value={stats.open}
              valueStyle={{ color: '#c41d7f' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} loading={loading}>
            <Statistic
              title="Đang sửa chữa"
              value={stats.inProgress}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} loading={loading}>
            <Statistic
              title="Đã khắc phục"
              value={stats.resolved}
              valueStyle={{ color: '#389e0d' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Phân bổ mức độ sự cố" bordered={false} loading={loading}>
            <Column {...columnConfig} height={320} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Trạng thái xử lý"
            bordered={false}
            loading={loading}
            extra={<Tag color="red" icon={<ExclamationCircleOutlined />}>{stats.highPriority} khẩn cấp</Tag>}
          >
            <Pie {...pieConfig} height={320} />
          </Card>
        </Col>
      </Row>

      <Card title="Sự cố mới được gán gần đây" bordered={false}>
        <Table
          columns={columns}
          dataSource={recentIncidents}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </Space>
  );
};

export default TechnicianDashboard;
