import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Card,
  Select,
  Tag,
  Space,
  Badge,
  Modal,
  Button,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
  Form,
  DatePicker,
  TimePicker,
  Input,
  message,
  Popover,
  Empty
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  DesktopOutlined,
  UserOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { CalendarProps } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { roomApi, type Room } from '../api/room';
import { bookingApi, type Booking, type BookingStatus } from '../api/booking';
import { timeSlotApi, type TimeSlot } from '../api/timeSlot';

const { Title, Text } = Typography;
const { RangePicker } = TimePicker;

export const statusConfig: Record<BookingStatus, { color: string; badgeStatus: 'success' | 'warning' | 'error' | 'default'; text: string; icon: React.ReactNode }> = {
  APPROVED: { color: 'green', badgeStatus: 'success', text: 'Đã duyệt', icon: <CheckCircleOutlined /> },
  PENDING: { color: 'gold', badgeStatus: 'warning', text: 'Đang chờ', icon: <SyncOutlined spin /> },
  REJECTED: { color: 'red', badgeStatus: 'error', text: 'Từ chối', icon: <CloseCircleOutlined /> },
  CANCELLED: { color: 'gray', badgeStatus: 'default', text: 'Đã hủy', icon: <CloseCircleOutlined /> },
};

const RoomScheduleCalendar: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal xem chi tiết ngày được chọn
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  // Modal tạo booking mới
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Load danh sách phòng máy và tiết học khi mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [roomRes, slotRes] = await Promise.all([
          roomApi.getAll(),
          timeSlotApi.getAll().catch(() => ({ data: [] as TimeSlot[] }))
        ]);
        setRooms(roomRes.data);
        setTimeSlots(slotRes.data);

        // Mặc định chọn phòng đầu tiên
        if (roomRes.data.length > 0) {
          setSelectedRoomId(roomRes.data[0].id);
        }
      } catch {
        message.error('Không thể tải danh sách phòng máy');
      }
    };
    fetchInitialData();
  }, []);

  // Tải danh sách lịch mượn phòng khi roomId thay đổi
  const fetchRoomBookings = async () => {
    if (!selectedRoomId) return;
    setLoading(true);
    try {
      // Tìm kiếm tất cả booking liên quan đến roomId
      const res = await bookingApi.search({
        filter: `room.id==${selectedRoomId}`,
        page: 0,
        size: 500,
        sort: ['startTime,asc']
      });
      setBookings(res.data.content);
    } catch {
      // Fallback: Lấy tất cả và lọc ở client nếu API search không hỗ trợ filter RSQL
      try {
        const resAll = await bookingApi.getAll();
        const filtered = resAll.data.filter((b: any) => b.roomId === selectedRoomId || b.room?.id === selectedRoomId);
        setBookings(filtered);
      } catch {
        message.error('Lỗi khi tải lịch đặt phòng');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomBookings();
  }, [selectedRoomId]);

  // Lọc booking theo trạng thái
  const filteredBookings = bookings.filter(b => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  // Tìm thông tin phòng đang chọn
  const currentRoom = rooms.find(r => r.id === selectedRoomId);

  // Hàm lấy danh sách booking của một ngày cụ thể
  const getBookingsByDate = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return filteredBookings.filter(b => {
      const bDate = b.bookingDate || (b.startTime ? b.startTime.split('T')[0] : '');
      return bDate === dateStr;
    });
  };

  // Render ô lịch (dateCellRender)
  const dateCellRender = (value: Dayjs) => {
    const listData = getBookingsByDate(value);
    if (listData.length === 0) return null;

    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {listData.slice(0, 3).map((item) => {
          const startTimeDisplay = item.startTime?.includes('T')
            ? item.startTime.split('T')[1]?.substring(0, 5)
            : item.startTime?.substring(0, 5);
          const endTimeDisplay = item.endTime?.includes('T')
            ? item.endTime.split('T')[1]?.substring(0, 5)
            : item.endTime?.substring(0, 5);

          const statusInfo = statusConfig[item.status] || statusConfig.PENDING;

          const content = (
            <div style={{ maxWidth: 240 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{item.purpose || 'Mượn phòng học'}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>
                <ClockCircleOutlined /> Khung giờ: {startTimeDisplay} - {endTimeDisplay}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: 12 }}>
                <UserOutlined /> Người đặt: {item.userName || item.user?.fullName || 'Giảng viên'}
              </p>
              <Tag color={statusInfo.color} style={{ marginTop: 6 }}>
                {statusInfo.text}
              </Tag>
            </div>
          );

          return (
            <li key={item.id} style={{ marginBottom: 3 }}>
              <Popover content={content} title="Chi tiết lịch đặt" trigger="hover">
                <div
                  style={{
                    backgroundColor: item.status === 'APPROVED' ? '#e6f7ff' : item.status === 'PENDING' ? '#fffbe6' : '#fff1f0',
                    borderLeft: `3px solid ${item.status === 'APPROVED' ? '#1890ff' : item.status === 'PENDING' ? '#faad14' : '#ff4d4f'}`,
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    cursor: 'pointer'
                  }}
                >
                  <Badge status={statusInfo.badgeStatus} />
                  <span style={{ fontWeight: 500, marginLeft: 4 }}>
                    {startTimeDisplay} - {item.purpose || 'Đã đặt'}
                  </span>
                </div>
              </Popover>
            </li>
          );
        })}
        {listData.length > 3 && (
          <li style={{ fontSize: 11, color: '#1890ff', textAlign: 'center', marginTop: 2 }}>
            + Xem thêm {listData.length - 3} lịch khác...
          </li>
        )}
      </ul>
    );
  };

  const cellRender: CalendarProps<Dayjs>['cellRender'] = (current, info) => {
    if (info.type === 'date') return dateCellRender(current);
    return info.originNode;
  };

  // Sự kiện khi click chọn 1 ngày trên Calendar
  const handleSelectDate = (date: Dayjs) => {
    setSelectedDate(date);
    setIsDayModalOpen(true);
  };

  // Mở modal đặt phòng nhanh cho ngày được chọn
  const handleOpenAddModal = (date?: Dayjs) => {
    const targetDate = date || selectedDate || dayjs();
    form.setFieldsValue({
      roomId: selectedRoomId,
      bookingDate: targetDate,
    });
    setIsAddModalOpen(true);
  };

  // Tự động điền khung giờ khi chọn tiết học
  const handleTimeSlotChange = (slotId?: number) => {
    if (!slotId) return;
    const selectedSlot = timeSlots.find(s => s.id === slotId);
    if (selectedSlot && selectedSlot.startTime && selectedSlot.endTime) {
      const startTimeStr = selectedSlot.startTime.substring(0, 5);
      const endTimeStr = selectedSlot.endTime.substring(0, 5);
      const startDay = dayjs(`2000-01-01 ${startTimeStr}`, 'YYYY-MM-DD HH:mm');
      const endDay = dayjs(`2000-01-01 ${endTimeStr}`, 'YYYY-MM-DD HH:mm');
      if (startDay.isValid() && endDay.isValid()) {
        form.setFieldsValue({ timeRange: [startDay, endDay] });
      }
    }
  };

  // Xử lý tạo lịch mượn phòng mới
  const handleCreateBooking = async (values: any) => {
    try {
      const bookingDateStr = values.bookingDate.format('YYYY-MM-DD');
      const startStr = values.timeRange[0].format('HH:mm:ss');
      const endStr = values.timeRange[1].format('HH:mm:ss');

      const payload: any = {
        room: { id: values.roomId },
        roomId: values.roomId,
        startTime: `${bookingDateStr}T${startStr}`,
        endTime: `${bookingDateStr}T${endStr}`,
        purpose: values.purpose
      };

      if (values.timeSlotId) {
        payload.timeSlot = { id: values.timeSlotId };
        payload.timeSlotId = values.timeSlotId;
      }

      await bookingApi.create(payload);
      message.success('Đã gửi yêu cầu mượn phòng thành công!');
      setIsAddModalOpen(false);
      form.resetFields();
      fetchRoomBookings();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi mượn phòng!');
    }
  };

  // Tính toán thống kê theo tháng
  const approvedCount = bookings.filter(b => b.status === 'APPROVED').length;
  const pendingCount = bookings.filter(b => b.status === 'PENDING').length;

  const selectedDayBookings = selectedDate ? getBookingsByDate(selectedDate) : [];

  return (
    <div>
      {/* Header Bar */}
      <Card style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={4}>
              <Title level={4} style={{ margin: 0 }}>
                <CalendarOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                Lịch mượn phòng máy VinhUniLab
              </Title>
              <Text type="secondary">
                Theo dõi chi tiết lịch sử dụng phòng máy trực quan dạng Lịch (Calendar)
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Select
                style={{ width: 220 }}
                placeholder="Chọn phòng máy"
                value={selectedRoomId}
                onChange={(val) => setSelectedRoomId(val)}
                options={rooms.map(r => ({
                  value: r.id,
                  label: `${r.roomName} (${r.location || 'Khu Lab'})`
                }))}
              />
              <Select
                style={{ width: 140 }}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'APPROVED', label: 'Đã duyệt' },
                  { value: 'PENDING', label: 'Đang chờ' },
                  { value: 'REJECTED', label: 'Từ chối' },
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={fetchRoomBookings} loading={loading}>
                Tải lại
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenAddModal()}>
                Đăng ký mượn
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Room Info & Metric Banner */}
        {currentRoom && (
          <Row gutter={16} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Col xs={12} sm={6}>
              <Statistic
                title="Phòng máy"
                value={currentRoom.roomName}
                prefix={<DesktopOutlined style={{ color: '#1890ff' }} />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Vị trí / Số chỗ"
                value={`${currentRoom.location || 'Khu Lab'} (${currentRoom.totalSeats || 30} ghế)`}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Lịch đã duyệt"
                value={approvedCount}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Yêu cầu chờ duyệt"
                value={pendingCount}
                valueStyle={{ color: '#faad14' }}
                prefix={<SyncOutlined />}
              />
            </Col>
          </Row>
        )}
      </Card>

      {/* Main Calendar View */}
      <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text strong>Chú thích trạng thái:</Text>
          <Tag color="green"><Badge status="success" /> Đã duyệt</Tag>
          <Tag color="gold"><Badge status="warning" /> Đang chờ duyệt</Tag>
          <Tag color="red"><Badge status="error" /> Từ chối</Tag>
        </div>

        <Calendar
          cellRender={cellRender}
          onSelect={handleSelectDate}
        />
      </Card>

      {/* Modal xem chi tiết danh sách lịch mượn của ngày được chọn */}
      <Modal
        title={
          <span>
            <CalendarOutlined style={{ color: '#1890ff', marginRight: 8 }} />
            Chi tiết lịch mượn ngày {selectedDate ? selectedDate.format('DD/MM/YYYY') : ''}
          </span>
        }
        open={isDayModalOpen}
        onCancel={() => setIsDayModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDayModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setIsDayModalOpen(false);
              handleOpenAddModal(selectedDate || dayjs());
            }}
          >
            Đăng ký mượn ngày này
          </Button>
        ]}
        width={600}
      >
        {selectedDayBookings.length === 0 ? (
          <Empty description="Chưa có lịch đặt phòng nào trong ngày này" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {selectedDayBookings.map((b) => {
              const statusInfo = statusConfig[b.status] || statusConfig.PENDING;
              const startTimeStr = b.startTime?.includes('T') ? b.startTime.split('T')[1]?.substring(0, 5) : b.startTime?.substring(0, 5);
              const endTimeStr = b.endTime?.includes('T') ? b.endTime.split('T')[1]?.substring(0, 5) : b.endTime?.substring(0, 5);

              return (
                <Card key={b.id} size="small" style={{ borderLeft: `4px solid ${statusInfo.color === 'green' ? '#52c41a' : statusInfo.color === 'gold' ? '#faad14' : '#ff4d4f'}` }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Text strong style={{ fontSize: 15 }}>{b.purpose || 'Mượn phòng máy'}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        Thời gian: <b>{startTimeStr} - {endTimeStr}</b>
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        <UserOutlined style={{ marginRight: 4 }} />
                        Người đặt: {b.userName || b.user?.fullName || 'Giảng viên'}
                      </Text>
                    </Col>
                    <Col>
                      <Tag color={statusInfo.color} icon={statusInfo.icon}>
                        {statusInfo.text}
                      </Tag>
                    </Col>
                  </Row>
                </Card>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Modal đăng ký mượn phòng */}
      <Modal
        title="Đăng ký mượn phòng máy"
        open={isAddModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsAddModalOpen(false)}
        okText="Gửi yêu cầu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateBooking}>
          <Form.Item name="roomId" label="Phòng máy" rules={[{ required: true, message: 'Vui lòng chọn phòng!' }]}>
            <Select placeholder="Chọn phòng">
              {rooms.map(r => (
                <Select.Option key={r.id} value={r.id}>
                  {r.roomName} ({r.location || 'Khu Lab'})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="timeSlotId" label="Tiết học (Danh mục)">
            <Select placeholder="Chọn tiết học (nếu có)" allowClear onChange={handleTimeSlotChange}>
              {timeSlots.map(ts => (
                <Select.Option key={ts.id} value={ts.id}>
                  {ts.slotName} ({ts.startTime ? ts.startTime.substring(0, 5) : ''} - {ts.endTime ? ts.endTime.substring(0, 5) : ''})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="bookingDate" label="Ngày mượn" rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}>
            <DatePicker style={{ width: '100%' }} minDate={dayjs()} />
          </Form.Item>

          <Form.Item name="timeRange" label="Khung giờ mượn" rules={[{ required: true, message: 'Vui lòng chọn khung giờ!' }]}>
            <RangePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="purpose" label="Mục đích mượn phòng" rules={[{ required: true, message: 'Vui lòng nhập mục đích!' }]}>
            <Input.TextArea placeholder="Ví dụ: Dạy thực hành Lập trình Web ca sáng" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomScheduleCalendar;
