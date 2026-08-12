import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Tag,
  Card,
  Space,
  Modal,
  Form,
  DatePicker,
  TimePicker,
  Input,
  message,
  Row,
  Col,
  Badge,
  Typography,
  Tabs,
  Popconfirm,
  Tooltip,
  Divider,
  Select
} from 'antd';
import {
  PlusOutlined,
  HistoryOutlined,
  StopOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  SendOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { bookingApi, type BookingStatus } from '../../api/booking';
import { roomApi, type Room } from '../../api/room';
import { timeSlotApi, type TimeSlot } from '../../api/timeSlot';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = TimePicker;

const TeacherBooking: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('history');

  // Selected state for Visual Booking Form
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);
  const [selectedSlotId, setSelectedSlotId] = useState<number | undefined>(undefined);

  // State cho phân trang và filter
  const [pagination, setPagination] = useState({ current: 1, pageSize: 6, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const [form] = Form.useForm();

  const fetchMyBookings = async (page = 1, size = 6, status = statusFilter) => {
    setLoading(true);
    try {
      const res = await bookingApi.getMyBookings({
        page: page - 1,
        size: size,
        status: status
      });
      setData(res.data.content);
      setPagination({
        ...pagination,
        current: page,
        total: res.data.totalElements
      });
    } catch {
      message.error('Không thể tải lịch sử mượn phòng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
    roomApi.getAll().then(res => {
      setRooms(res.data);
      if (res.data.length > 0) setSelectedRoomId(res.data[0].id);
    }).catch(() => {});
    timeSlotApi.getAll().then(res => setTimeSlots(res.data)).catch(() => {});
  }, []);

  const handleTableChange = (newPagination: any) => {
    fetchMyBookings(newPagination.current, newPagination.pageSize);
  };

  // Chọn tiết học từ Ma trận Tiết học Chips
  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlotId(slot.id);
    form.setFieldsValue({ timeSlotId: slot.id });

    if (slot.startTime && slot.endTime) {
      const startTimeStr = slot.startTime.substring(0, 5);
      const endTimeStr = slot.endTime.substring(0, 5);
      const startDay = dayjs(`2000-01-01 ${startTimeStr}`, 'YYYY-MM-DD HH:mm');
      const endDay = dayjs(`2000-01-01 ${endTimeStr}`, 'YYYY-MM-DD HH:mm');
      if (startDay.isValid() && endDay.isValid()) {
        form.setFieldsValue({ timeRange: [startDay, endDay] });
      }
    }
  };

  // Khi thay đổi phòng máy
  const handleSelectRoom = (roomId: number) => {
    setSelectedRoomId(roomId);
    form.setFieldsValue({ roomId });
  };

  // Xử lý gửi Form đăng ký mượn
  const handleCreate = async (values: any) => {
    try {
      const bookingDate = values.bookingDate.format('YYYY-MM-DD');
      const start = values.timeRange[0].format('HH:mm:ss');
      const end = values.timeRange[1].format('HH:mm:ss');

      const payload: any = {
        room: { id: values.roomId },
        startTime: `${bookingDate}T${start}`,
        endTime: `${bookingDate}T${end}`,
        purpose: values.purpose,
        status: 'PENDING'
      };

      if (values.timeSlotId) {
        payload.timeSlot = { id: values.timeSlotId };
      }

      await bookingApi.create(payload);

      message.success('Gửi yêu cầu mượn phòng thành công!');
      form.resetFields();
      setIsModalOpen(false);
      fetchMyBookings(1);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const statusMap: Record<BookingStatus, { color: string; text: string; icon: React.ReactNode }> = {
    PENDING: { color: 'gold', text: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
    APPROVED: { color: 'green', text: 'Đã duyệt', icon: <CheckCircleOutlined /> },
    REJECTED: { color: 'red', text: 'Từ chối', icon: <StopOutlined /> },
    CANCELLED: { color: 'gray', text: 'Đã hủy', icon: <StopOutlined /> },
  };

  const selectedRoomObj = rooms.find(r => r.id === (form.getFieldValue('roomId') || selectedRoomId));
  const selectedSlotObj = timeSlots.find(s => s.id === (form.getFieldValue('timeSlotId') || selectedSlotId));
  const formBookingDate = form.getFieldValue('bookingDate');
  const formTimeRange = form.getFieldValue('timeRange');

  const columns = [
    {
      title: 'Phòng máy',
      key: 'room',
      render: (record: any) => (
        <Space>
          <DesktopOutlined style={{ color: '#1890ff', fontSize: 16 }} />
          <Text strong>{record.room?.roomName || record.roomName || 'N/A'}</Text>
        </Space>
      )
    },
    {
      title: 'Ngày mượn',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (dateStr: string) => (
        <Space>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <span>{dateStr ? dateStr.substring(0, 10) : '---'}</span>
        </Space>
      )
    },
    {
      title: 'Khung giờ / Tiết học',
      key: 'time',
      render: (record: any) => {
        const start = record.startTime?.includes('T') ? record.startTime.split('T')[1]?.substring(0, 5) : record.startTime?.substring(0, 5);
        const end = record.endTime?.includes('T') ? record.endTime.split('T')[1]?.substring(0, 5) : record.endTime?.substring(0, 5);
        return (
          <Tag color="blue" icon={<ClockCircleOutlined />}>
            {start} - {end}
          </Tag>
        );
      }
    },
    {
      title: 'Mục đích',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
      render: (text: string) => <span>{text || 'Thực hành môn học'}</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: BookingStatus) => {
        const item = statusMap[status] || statusMap.PENDING;
        return <Tag color={item.color} icon={item.icon}>{item.text}</Tag>;
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (record: any) => (
        record.status === 'PENDING' && (
          <Popconfirm
            title="Xác nhận hủy yêu cầu mượn phòng này?"
            onConfirm={() => bookingApi.cancel(record.id).then(() => {
              message.success('Đã hủy yêu cầu!');
              fetchMyBookings();
            })}
            okText="Hủy lịch"
            cancelText="Đóng"
          >
            <Button danger size="small" icon={<StopOutlined />}>
              Hủy yêu cầu
            </Button>
          </Popconfirm>
        )
      )
    }
  ];

  const morningSlots = timeSlots.filter(s => parseInt(s.startTime?.substring(0, 2) || '0', 10) < 12);
  const afternoonSlots = timeSlots.filter(s => parseInt(s.startTime?.substring(0, 2) || '0', 10) >= 12);

  return (
    <div style={{ padding: 0 }}>
      {/* Visual Header Banner */}
      <Card
        style={{
          marginBottom: 16,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(22, 119, 255, 0.2)'
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              <DesktopOutlined style={{ marginRight: 10 }} />
              Đăng ký & Quản lý mượn phòng máy
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14 }}>
              Hệ thống đăng ký phòng thực hành máy tính trực quan dành cho Giảng viên VinhUni
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                if (rooms.length > 0) handleSelectRoom(rooms[0].id);
                setIsModalOpen(true);
              }}
              style={{
                backgroundColor: '#ffffff',
                color: '#1677ff',
                fontWeight: 600,
                border: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
            >
              Tạo yêu cầu mượn phòng
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Tabs Container */}
      <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined /> Lịch sử mượn phòng của tôi
                </span>
              ),
              children: (
                <div>
                  <Row justify="end" style={{ marginBottom: 16 }}>
                    <Space>
                      <Select
                        placeholder="Lọc trạng thái"
                        allowClear
                        style={{ width: 160 }}
                        value={statusFilter}
                        onChange={(val) => {
                          setStatusFilter(val);
                          fetchMyBookings(1, 6, val);
                        }}
                        options={[
                          { value: 'PENDING', label: '🟡 Chờ duyệt' },
                          { value: 'APPROVED', label: '🟢 Đã duyệt' },
                          { value: 'REJECTED', label: '🔴 Từ chối' },
                        ]}
                      />
                    </Space>
                  </Row>

                  <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    pagination={pagination}
                    onChange={handleTableChange}
                  />
                </div>
              )
            },
            {
              key: 'quick-booking',
              label: (
                <span>
                  <ThunderboltOutlined /> Đặt phòng nhanh (Visual Grid)
                </span>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  <Row gutter={24}>
                    {/* Left Column: Room Grid & Slot Matrix */}
                    <Col xs={24} lg={15}>
                      {/* Step 1: Room Selection Cards */}
                      <div style={{ marginBottom: 20 }}>
                        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 10 }}>
                          1️⃣ Chọn phòng máy muốn mượn:
                        </Text>
                        <Row gutter={[12, 12]}>
                          {rooms.map(room => {
                            const isSelected = (form.getFieldValue('roomId') || selectedRoomId) === room.id;
                            return (
                              <Col xs={12} sm={8} key={room.id}>
                                <Card
                                  hoverable
                                  size="small"
                                  onClick={() => handleSelectRoom(room.id)}
                                  style={{
                                    borderRadius: 10,
                                    borderColor: isSelected ? '#1677ff' : '#f0f0f0',
                                    borderWidth: isSelected ? 2 : 1,
                                    backgroundColor: isSelected ? '#e6f4ff' : '#ffffff',
                                    transition: 'all 0.2s',
                                    boxShadow: isSelected ? '0 4px 12px rgba(22,119,255,0.15)' : 'none'
                                  }}
                                >
                                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Text strong style={{ color: isSelected ? '#1677ff' : '#262626' }}>
                                        {room.roomName}
                                      </Text>
                                      {isSelected && <CheckCircleOutlined style={{ color: '#1677ff' }} />}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      <EnvironmentOutlined /> {room.location || 'Khu Lab'}
                                    </Text>
                                    <Tag color="blue" style={{ marginTop: 4, width: 'fit-content', fontSize: 11 }}>
                                      {room.totalSeats || 30} ghế
                                    </Tag>
                                  </Space>
                                </Card>
                              </Col>
                            );
                          })}
                        </Row>
                      </div>

                      {/* Step 2: Time Slots Matrix */}
                      <div>
                        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 10 }}>
                          2️⃣ Chọn tiết học (Khung giờ mẫu):
                        </Text>

                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                            ☀️ Ca Sáng:
                          </Text>
                          <Space wrap size={[8, 8]}>
                            {morningSlots.map(slot => {
                              const isSelected = (form.getFieldValue('timeSlotId') || selectedSlotId) === slot.id;
                              return (
                                <Tag.CheckableTag
                                  key={slot.id}
                                  checked={isSelected}
                                  onChange={() => handleSelectSlot(slot)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    border: isSelected ? '1px solid #1677ff' : '1px solid #d9d9d9'
                                  }}
                                >
                                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                                  {slot.slotName} ({slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)})
                                </Tag.CheckableTag>
                              );
                            })}
                          </Space>
                        </div>

                        <div>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                            🌙 Ca Chiều / Tối:
                          </Text>
                          <Space wrap size={[8, 8]}>
                            {afternoonSlots.map(slot => {
                              const isSelected = (form.getFieldValue('timeSlotId') || selectedSlotId) === slot.id;
                              return (
                                <Tag.CheckableTag
                                  key={slot.id}
                                  checked={isSelected}
                                  onChange={() => handleSelectSlot(slot)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    border: isSelected ? '1px solid #1677ff' : '1px solid #d9d9d9'
                                  }}
                                >
                                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                                  {slot.slotName} ({slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)})
                                </Tag.CheckableTag>
                              );
                            })}
                          </Space>
                        </div>
                      </div>
                    </Col>

                    {/* Right Column: Live Booking Form Preview */}
                    <Col xs={24} lg={9}>
                      <Card
                        title={
                          <span>
                            <SendOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                            Thông tin đăng ký mượn
                          </span>
                        }
                        style={{ borderRadius: 10, background: '#fafafa', border: '1px solid #f0f0f0' }}
                      >
                        <Form form={form} layout="vertical" onFinish={handleCreate}>
                          <Form.Item name="roomId" label="Phòng máy chọn" rules={[{ required: true, message: 'Chọn phòng máy!' }]}>
                            <Select placeholder="Chọn phòng máy" onChange={setSelectedRoomId}>
                              {rooms.map(r => <Select.Option key={r.id} value={r.id}>{r.roomName} ({r.location})</Select.Option>)}
                            </Select>
                          </Form.Item>

                          <Form.Item name="bookingDate" label="Ngày mượn" rules={[{ required: true, message: 'Chọn ngày!' }]}>
                            <DatePicker style={{ width: '100%' }} minDate={dayjs()} format="YYYY-MM-DD" />
                          </Form.Item>

                          <Form.Item name="timeSlotId" label="Tiết học (Optional)">
                            <Select placeholder="Chọn tiết học" allowClear onChange={(id) => {
                              const s = timeSlots.find(x => x.id === id);
                              if (s) handleSelectSlot(s);
                            }}>
                              {timeSlots.map(ts => (
                                <Select.Option key={ts.id} value={ts.id}>
                                  {ts.slotName} ({ts.startTime?.substring(0, 5)} - {ts.endTime?.substring(0, 5)})
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>

                          <Form.Item name="timeRange" label="Khung giờ mượn" rules={[{ required: true, message: 'Chọn khung giờ!' }]}>
                            <RangePicker format="HH:mm" style={{ width: '100%' }} />
                          </Form.Item>

                          <Form.Item name="purpose" label="Mục đích mượn phòng" rules={[{ required: true, message: 'Nhập mục đích!' }]}>
                            <Input.TextArea placeholder="Ví dụ: Dạy bù môn Kỹ thuật lập trình" rows={3} />
                          </Form.Item>

                          <Button type="primary" block size="large" htmlType="submit" icon={<SendOutlined />}>
                            Gửi yêu cầu mượn phòng
                          </Button>
                        </Form>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Modal đăng ký mượn nâng cao */}
      <Modal
        title={
          <span>
            <DesktopOutlined style={{ color: '#1677ff', marginRight: 8 }} />
            Đăng ký mượn phòng máy thực hành
          </span>
        }
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        okText="Gửi yêu cầu"
        cancelText="Hủy"
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roomId" label="Chọn phòng máy" rules={[{ required: true, message: 'Vui lòng chọn phòng!' }]}>
                <Select placeholder="Chọn phòng máy" onChange={handleSelectRoom}>
                  {rooms.map(r => (
                    <Select.Option key={r.id} value={r.id}>
                      {r.roomName} ({r.location || 'Khu Lab'}) - {r.totalSeats || 30} ghế
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bookingDate" label="Ngày mượn" rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}>
                <DatePicker style={{ width: '100%' }} minDate={dayjs()} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="timeSlotId" label="Chọn tiết học (Danh mục có sẵn)">
            <Select placeholder="Chọn tiết học (Tiết 1 đến Tiết 10...)" allowClear onChange={(id) => {
              const s = timeSlots.find(x => x.id === id);
              if (s) handleSelectSlot(s);
            }}>
              {timeSlots.map(ts => (
                <Select.Option key={ts.id} value={ts.id}>
                  {ts.slotName} ({ts.startTime ? ts.startTime.substring(0, 5) : ''} - {ts.endTime ? ts.endTime.substring(0, 5) : ''})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="timeRange" label="Thời gian mượn (Giờ bắt đầu - Giờ kết thúc)" rules={[{ required: true, message: 'Chọn thời gian!' }]}>
            <RangePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="purpose" label="Mục đích sử dụng / Tên môn học" rules={[{ required: true, message: 'Vui lòng nhập mục đích!' }]}>
            <Input.TextArea placeholder="Ví dụ: Dạy thực hành Lập trình Java ca sáng" rows={3} />
          </Form.Item>

          {/* Live Summary Preview Box */}
          <div style={{ background: '#e6f4ff', padding: '12px 16px', borderRadius: 8, border: '1px solid #91caff' }}>
            <Text strong style={{ color: '#0958d9' }}>
              <InfoCircleOutlined style={{ marginRight: 6 }} />
              Xem trước thông tin đặt phòng:
            </Text>
            <Row gutter={16} style={{ marginTop: 6, fontSize: 13 }}>
              <Col span={12}>
                📌 Phòng: <b>{selectedRoomObj?.roomName || 'Chưa chọn'}</b>
              </Col>
              <Col span={12}>
                📅 Ngày: <b>{formBookingDate ? formBookingDate.format('DD/MM/YYYY') : 'Chưa chọn'}</b>
              </Col>
              <Col span={12} style={{ marginTop: 4 }}>
                ⏰ Tiết: <b>{selectedSlotObj?.slotName || 'Tùy chỉnh'}</b>
              </Col>
              <Col span={12} style={{ marginTop: 4 }}>
                ⏱️ Khung giờ: <b>{formTimeRange ? `${formTimeRange[0]?.format('HH:mm')} - ${formTimeRange[1]?.format('HH:mm')}` : 'Chưa chọn'}</b>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherBooking;
