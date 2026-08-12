import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Card,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Space,
  Badge,
  Typography,
  Tooltip
} from 'antd';
import {
  AlertOutlined,
  PlusOutlined,
  HistoryOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { incidentApi, type Incident, type Priority } from '../../api/incident';
import { roomApi, type Room } from '../../api/room';
import { computerApi, type Computer } from '../../api/computer';
import { getApiErrorMessage, isFormValidationError } from '../../utils/apiError';

const { Title, Text } = Typography;

const PRESET_INCIDENTS = [
  '🖥️ Màn hình không lên / Bị xanh màn hình',
  '⌨️ Chuột hoặc Bàn phím bị hỏng / Không nhận',
  '🌐 Mất kết nối Internet / Cáp mạng lỏng',
  '💻 Lỗi hệ điều hành / Máy giật lag ngắt giữa chừng',
  '🔌 Nguồn máy tính bị ngắt / Không bật được máy'
];

const IncidentReport: React.FC = () => {
  const [form] = Form.useForm();

  // States
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [selectedComputerId, setSelectedComputerId] = useState<number | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load dữ liệu ban đầu
  useEffect(() => {
    fetchHistory();
    roomApi.getAll().then(res => setRooms(res.data)).catch(() => {});
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await incidentApi.getMyIncidents(0, 50);
      setIncidents(res.data.content);
    } catch {
      message.error("Không thể tải lịch sử báo cáo sự cố");
    } finally {
      setLoading(false);
    }
  };

  // Logic xử lý khi chọn phòng máy
  const handleRoomChange = async (roomId: number) => {
    form.setFieldsValue({ computerId: undefined });
    setSelectedComputerId(undefined);
    setLoading(true);
    try {
      const res = await computerApi.getAll();
      const roomComputers = res.data.filter(c => c.roomId === roomId);
      setComputers(roomComputers);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectComputer = (computerId: number) => {
    setSelectedComputerId(computerId);
    form.setFieldsValue({ computerId });
  };

  const handleApplyPreset = (presetText: string) => {
    const currentDesc = form.getFieldValue('description') || '';
    form.setFieldsValue({
      description: currentDesc ? `${currentDesc} - ${presetText}` : presetText
    });
  };

  const handleOpenModal = () => {
    form.resetFields();
    setComputers([]);
    setSelectedComputerId(undefined);
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        ...values,
        computer: { id: values.computerId },
      };
      await incidentApi.create(payload);
      message.success("Báo cáo sự cố đã được gửi thành công!");
      setIsModalOpen(false);
      fetchHistory();
    } catch (error) {
      if (isFormValidationError(error)) return;
      message.error(getApiErrorMessage(error, 'Gửi báo cáo sự cố thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  const priorityOptions = [
    { value: 'LOW', label: 'Thấp (Chuột, phím, tai nghe...)', color: 'blue' },
    { value: 'NORMAL', label: 'Trung bình (Lỗi phần mềm, mạng)', color: 'orange' },
    { value: 'HIGH', label: 'Khẩn cấp (Máy ngắt nguồn, hỏng phần cứng)', color: 'red' },
  ];

  const openCount = incidents.filter(i => i.status === 'OPEN').length;
  const inProgressCount = incidents.filter(i => i.status === 'IN_PROGRESS').length;
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED').length;

  const columns: ColumnsType<Incident> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_v, _r, index) => index + 1,
    },
    {
      title: 'Thời gian gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          <span>{d ? new Date(d).toLocaleString('vi-VN') : '-'}</span>
        </Space>
      )
    },
    {
      title: 'Vị trí & Máy tính',
      key: 'location',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#1890ff' }}>
            <DesktopOutlined /> {record.computer?.computerCode ?? `Máy #${record.computerId}`}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <EnvironmentOutlined /> {record.roomName || 'Khu Lab'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Mô tả sự cố',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>
    },
    {
      title: 'Mức độ',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: Priority) => {
        const opt = priorityOptions.find(o => o.value === p);
        return <Tag color={opt?.color}>{opt?.label.split(' ')[0] || p}</Tag>;
      }
    },
    {
      title: 'Trạng thái xử lý',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <>
          {status === 'OPEN' && <Tag color="volcano" icon={<AlertOutlined />}>ĐANG CHỜ TIẾP NHẬN</Tag>}
          {status === 'IN_PROGRESS' && <Tag color="processing" icon={<SyncOutlined spin />}>ĐANG SỬA CHỮA</Tag>}
          {status === 'RESOLVED' && <Tag color="success" icon={<CheckCircleOutlined />}>ĐÃ KHẮC PHỤC</Tag>}
        </>
      )
    },
  ];

  return (
    <div style={{ padding: 0 }}>
      {/* Top Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng sự cố đã báo"
              value={incidents.length}
              prefix={<HistoryOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Chờ tiếp nhận"
              value={openCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<Badge status="error" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đang được sửa"
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
            <HistoryOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Lịch sử Báo cáo Sự cố Phòng máy
          </span>
        }
        extra={
          <Button
            type="primary"
            danger
            icon={<PlusOutlined />}
            onClick={handleOpenModal}
            style={{ fontWeight: 600 }}
          >
            Báo cáo sự cố mới
          </Button>
        }
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Table
          columns={columns}
          dataSource={incidents}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
        />

        {/* Modal Báo cáo Sự cố Nâng cao */}
        <Modal
          title={
            <span>
              <AlertOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
              Gửi Báo cáo Sự cố Thiết bị Phòng máy
            </span>
          }
          open={isModalOpen}
          onOk={handleOk}
          onCancel={() => setIsModalOpen(false)}
          confirmLoading={submitting}
          okText="Gửi báo cáo"
          okButtonProps={{ danger: true }}
          cancelText="Hủy bỏ"
          width={650}
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="roomId" label="Chọn phòng máy" rules={[{ required: true, message: 'Chọn phòng máy' }]}>
                  <Select placeholder="Chọn phòng máy" onChange={handleRoomChange}>
                    {rooms.map(r => (
                      <Select.Option key={r.id} value={r.id}>{r.roomName} ({r.location || 'Khu Lab'})</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="computerId" label="Chọn máy tính bị lỗi" rules={[{ required: true, message: 'Chọn máy tính' }]}>
                  <Select
                    placeholder="Chọn máy tính"
                    disabled={computers.length === 0}
                    onChange={(val) => setSelectedComputerId(val)}
                  >
                    {computers.map(c => (
                      <Select.Option key={c.id} value={c.id}>
                        <DesktopOutlined /> {c.computerCode}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Quick Visual Computers Grid */}
            {computers.length > 0 && (
              <div style={{ marginBottom: 16, background: '#f5f5f5', padding: 12, borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  🖥️ Chọn nhanh máy tính trong phòng:
                </Text>
                <Space wrap size={[6, 6]}>
                  {computers.map(c => {
                    const isSelected = (form.getFieldValue('computerId') || selectedComputerId) === c.id;
                    return (
                      <Tag
                        key={c.id}
                        color={isSelected ? 'red' : 'default'}
                        style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleSelectComputer(c.id)}
                      >
                        <DesktopOutlined /> {c.computerCode}
                      </Tag>
                    );
                  })}
                </Space>
              </div>
            )}

            <Form.Item name="priority" label="Mức độ nghiêm trọng" initialValue="LOW">
              <Select>
                {priorityOptions.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* Quick Preset Errors */}
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                ⚡ Mẫu mô tả lỗi nhanh:
              </Text>
              <Space wrap size={[4, 6]}>
                {PRESET_INCIDENTS.map((preset, idx) => (
                  <Tag
                    key={idx}
                    color="volcano"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleApplyPreset(preset)}
                  >
                    {preset}
                  </Tag>
                ))}
              </Space>
            </div>

            <Form.Item
              name="description"
              label="Mô tả chi tiết sự cố"
              rules={[{ required: true, message: 'Vui lòng nhập mô tả lỗi' }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="Mô tả cụ thể hiện tượng lỗi (Ví dụ: Máy số PC-05 bật nguồn không lên, có tiếng kêu beep...)"
              />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default IncidentReport;
