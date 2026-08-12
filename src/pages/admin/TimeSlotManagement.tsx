import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, TimePicker, Space, Popconfirm, message, Card, Tag, Row, Col, Statistic, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined, ClockCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { timeSlotApi, type TimeSlot } from '../../api/timeSlot';
import { getApiErrorMessage, isFormValidationError } from '../../utils/apiError';

const buildTimeSlotFilter = (keyword: string) => {
  const value = keyword.trim();
  if (!value) return 'id!=0';

  const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `(slotName=='*${escapedValue}*',startTime=='*${escapedValue}*',endTime=='*${escapedValue}*')`;
};

// Hàm tính số phút giữa 2 thời gian HH:mm
const calculateDurationMinutes = (startTime?: string, endTime?: string): number => {
  if (!startTime || !endTime) return 0;
  const start = dayjs(`2000-01-01 ${startTime}`, 'YYYY-MM-DD HH:mm');
  const end = dayjs(`2000-01-01 ${endTime}`, 'YYYY-MM-DD HH:mm');
  if (!start.isValid() || !end.isValid()) return 0;
  const diff = end.diff(start, 'minute');
  return diff > 0 ? diff : 0;
};

// Các khung giờ mẫu tiêu chuẩn phổ biến
const DEFAULT_PRESETS: Array<{ slotName: string; startTime: string; endTime: string }> = [
  { slotName: 'Tiết 1', startTime: '07:00', endTime: '07:45' },
  { slotName: 'Tiết 2', startTime: '07:50', endTime: '08:35' },
  { slotName: 'Tiết 3', startTime: '08:40', endTime: '09:25' },
  { slotName: 'Tiết 4', startTime: '09:30', endTime: '10:15' },
  { slotName: 'Tiết 5', startTime: '10:20', endTime: '11:05' },
  { slotName: 'Tiết 6', startTime: '13:00', endTime: '13:45' },
  { slotName: 'Tiết 7', startTime: '13:50', endTime: '14:35' },
  { slotName: 'Tiết 8', startTime: '14:40', endTime: '15:25' },
  { slotName: 'Tiết 9', startTime: '15:30', endTime: '16:15' },
  { slotName: 'Tiết 10', startTime: '16:20', endTime: '17:05' },
];

const TimeSlotManagement: React.FC = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("id!=0");
  const [searchText, setSearchText] = useState('');
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [form] = Form.useForm();

  // Hàm tải dữ liệu từ API
  const fetchTimeSlots = async () => {
    setLoading(true);
    try {
      const response = await timeSlotApi.search({ filter, page, size, sort: ['startTime,asc'] });
      setTimeSlots(response.data.content);
      setTotal(response.data.totalElements);
    } catch {
      message.error('Không thể tải danh sách tiết học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
  }, [size, page, filter]);

  const showAddModal = () => {
    setEditingSlot(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const showEditModal = (record: TimeSlot) => {
    setEditingSlot(record);
    form.setFieldsValue({
      slotName: record.slotName,
      timeRange: [
        dayjs(`2000-01-01 ${record.startTime}`, 'YYYY-MM-DD HH:mm'),
        dayjs(`2000-01-01 ${record.endTime}`, 'YYYY-MM-DD HH:mm')
      ]
    });
    setIsModalOpen(true);
  };

  const handleApplyPreset = (preset: { slotName: string; startTime: string; endTime: string }) => {
    form.setFieldsValue({
      slotName: preset.slotName,
      timeRange: [
        dayjs(`2000-01-01 ${preset.startTime}`, 'YYYY-MM-DD HH:mm'),
        dayjs(`2000-01-01 ${preset.endTime}`, 'YYYY-MM-DD HH:mm')
      ]
    });
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<TimeSlot> = {
        slotName: values.slotName,
        startTime: values.timeRange[0].format('HH:mm'),
        endTime: values.timeRange[1].format('HH:mm'),
      };

      if (editingSlot) {
        await timeSlotApi.update(editingSlot.id, payload);
        message.success('Cập nhật tiết học thành công');
      } else {
        await timeSlotApi.create(payload);
        message.success('Thêm tiết học mới thành công');
      }
      setIsModalOpen(false);
      fetchTimeSlots();
    } catch (error) {
      if (isFormValidationError(error)) {
        return;
      }
      message.error(getApiErrorMessage(error, 'Lưu thông tin tiết học thất bại'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await timeSlotApi.delete(id);
      message.success('Đã xóa tiết học');
      fetchTimeSlots();
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Xóa thất bại'));
    }
  };

  const handleSearch = (value: string) => {
    setPage(0);
    setFilter(buildTimeSlotFilter(value));
  };

  const columns: ColumnsType<TimeSlot> = [
    {
      title: 'STT',
      key: 'index',
      width: 70,
      render: (_value, _record, index) => (page * size) + index + 1,
    },
    {
      title: 'Tên tiết học',
      dataIndex: 'slotName',
      key: 'slotName',
      render: (text: string) => (
        <span style={{ fontWeight: 600, color: '#1890ff' }}>
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          {text || 'Chưa đặt tên'}
        </span>
      ),
    },
    {
      title: 'Giờ bắt đầu',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time: string) => <Tag color="blue">{time ? time.substring(0, 5) : '--:--'}</Tag>,
    },
    {
      title: 'Giờ kết thúc',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time: string) => <Tag color="cyan">{time ? time.substring(0, 5) : '--:--'}</Tag>,
    },
    {
      title: 'Thời lượng',
      key: 'duration',
      render: (_, record) => {
        const minutes = calculateDurationMinutes(record.startTime, record.endTime);
        return <Tag color={minutes > 0 ? 'green' : 'default'}>{minutes > 0 ? `${minutes} phút` : 'Khác'}</Tag>;
      },
    },
    {
      title: 'Ca học',
      key: 'session',
      render: (_, record) => {
        const startHour = parseInt(record.startTime?.substring(0, 2) || '0', 10);
        if (startHour < 12) {
          return <Tag color="gold">Sáng</Tag>;
        } else if (startHour < 18) {
          return <Tag color="orange">Chiều</Tag>;
        }
        return <Tag color="purple">Tối</Tag>;
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa">
            <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} type="text" style={{ color: '#1890ff' }} />
          </Tooltip>
          <Popconfirm title="Xóa tiết học này?" onConfirm={() => handleDelete(record.id)} okText="Có" cancelText="Không">
            <Tooltip title="Xóa">
              <Button icon={<DeleteOutlined />} type="text" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const morningCount = timeSlots.filter(s => parseInt(s.startTime?.substring(0, 2) || '0', 10) < 12).length;
  const afternoonCount = timeSlots.filter(s => parseInt(s.startTime?.substring(0, 2) || '0', 10) >= 12).length;

  return (
    <div style={{ padding: '16px 16px' }}>
      {/* Header Statistics Dashboard */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng số tiết học"
              value={total}
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tiết học ca sáng"
              value={morningCount}
              valueStyle={{ color: '#d48806' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tiết học ca chiều / tối"
              value={afternoonCount}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card
        title="Danh mục Quản lý Tiết học"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTimeSlots}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>Thêm tiết học</Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            enterButton={<SearchOutlined />}
            placeholder="Tìm theo tên tiết hoặc giờ (07:00, Tiết 1)..."
            style={{ width: 340 }}
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
          dataSource={timeSlots}
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

        <Modal
          title={editingSlot ? "Chỉnh sửa tiết học" : "Thêm tiết học mới"}
          open={isModalOpen}
          onOk={handleOk}
          onCancel={() => setIsModalOpen(false)}
          okText="Lưu lại"
          cancelText="Hủy"
          width={520}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="slotName"
              label="Tên tiết học"
              rules={[{ required: true, message: 'Tên tiết học không được để trống!' }]}
            >
              <Input placeholder="Ví dụ: Tiết 1, Tiết 2..." />
            </Form.Item>

            <Form.Item
              name="timeRange"
              label="Khung giờ (Giờ bắt đầu - Giờ kết thúc)"
              rules={[{ required: true, message: 'Vui lòng chọn khung giờ học!' }]}
            >
              <TimePicker.RangePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
            </Form.Item>

            {!editingSlot && (
              <div style={{ marginTop: 12, padding: '12px', background: '#f5f5f5', borderRadius: 6 }}>
                <span style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 8 }}>
                  ⚡ Mẫu tiết học gợi ý nhanh:
                </span>
                <Space wrap size={[4, 8]}>
                  {DEFAULT_PRESETS.map((preset) => (
                    <Tag
                      key={preset.slotName}
                      color="blue"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleApplyPreset(preset)}
                    >
                      {preset.slotName} ({preset.startTime}-{preset.endTime})
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default TimeSlotManagement;
