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
  Empty,
  Popconfirm,
  Segmented,
  Spin,
  Table
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
  ReloadOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';
import type { CalendarProps } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { roomApi, type Room } from '../../api/room';
import { bookingApi, type Booking, type BookingStatus } from '../../api/booking';
import { timeSlotApi, type TimeSlot } from '../../api/timeSlot';

const { Title, Text } = Typography;
const { RangePicker } = TimePicker;

export const adminStatusConfig: Record<BookingStatus, { color: string; badgeStatus: 'success' | 'warning' | 'error' | 'default'; text: string; icon: React.ReactNode }> = {
  APPROVED: { color: 'green', badgeStatus: 'success', text: 'Đã duyệt', icon: <CheckCircleOutlined /> },
  PENDING: { color: 'gold', badgeStatus: 'warning', text: 'Chờ duyệt', icon: <SyncOutlined spin /> },
  REJECTED: { color: 'red', badgeStatus: 'error', text: 'Từ chối', icon: <CloseCircleOutlined /> },
  CANCELLED: { color: 'gray', badgeStatus: 'default', text: 'Đã hủy', icon: <CloseCircleOutlined /> },
  RETURNED: { color: 'cyan', badgeStatus: 'default', text: 'Đã trả phòng', icon: <CheckCircleOutlined /> },
};

const AdminRoomSchedule: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);

  // Chế độ xem: Month Calendar vs Weekly Timetable Matrix
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const getMonday = (d: Dayjs) => {
    const day = d.day();
    if (day === 0) return d.subtract(6, 'day');
    return d.subtract(day - 1, 'day');
  };

  const [selectedWeekStart, setSelectedWeekStart] = useState<Dayjs>(getMonday(dayjs()));

  // Modal xem chi tiết ngày được chọn
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  // Modal tạo booking mới
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Tải phòng máy & tiết học khi mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [roomRes, slotRes] = await Promise.all([
          roomApi.getAll(),
          timeSlotApi.getAll().catch(() => ({ data: [] as TimeSlot[] }))
        ]);
        setRooms(roomRes.data);
        setTimeSlots(slotRes.data);

        if (roomRes.data.length > 0) {
          setSelectedRoomId(roomRes.data[0].id);
        }
      } catch {
        message.error('Không thể tải danh sách phòng máy');
      }
    };
    fetchInitialData();
  }, []);

  // Tải danh sách lịch mượn phòng theo roomId
  const fetchRoomBookings = async () => {
    if (!selectedRoomId) return;
    setLoading(true);
    try {
      const res = await bookingApi.search({
        filter: `room.id==${selectedRoomId}`,
        page: 0,
        size: 500,
        sort: ['startTime,asc']
      });
      setBookings(res.data.content);
    } catch {
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

  // Lọc danh sách booking theo statusFilter
  const filteredBookings = bookings.filter(b => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  const currentRoom = rooms.find(r => r.id === selectedRoomId);

  // Lấy booking của 1 ngày
  const getBookingsByDate = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return filteredBookings.filter(b => {
      const bDate = b.bookingDate || (b.startTime ? b.startTime.split('T')[0] : '');
      return bDate === dateStr;
    });
  };

  // Kiểm tra 1 tiết học có bị trùng lịch trong ngày cụ thể không
  const checkSlotStatus = (slot: TimeSlot, checkDate: Dayjs) => {
    if (!slot.startTime || !slot.endTime || !filteredBookings || filteredBookings.length === 0) {
      return { isBooked: false, bookingInfo: null };
    }

    const dateStr = checkDate.format('YYYY-MM-DD');
    const slotStartStr = `${dateStr}T${slot.startTime.substring(0, 5)}:00`;
    const slotEndStr = `${dateStr}T${slot.endTime.substring(0, 5)}:00`;
    const slotStart = dayjs(slotStartStr);
    const slotEnd = dayjs(slotEndStr);

    const existingBooking = filteredBookings.find(b => {
      if (b.status === 'REJECTED' || b.status === 'CANCELLED' || b.status === 'RETURNED') {
        return false;
      }
      const bDate = b.bookingDate || (b.startTime ? b.startTime.split('T')[0] : '');
      if (bDate !== dateStr) return false;

      const bStart = dayjs(b.startTime);
      const bEnd = dayjs(b.endTime);

      return bStart.isBefore(slotEnd) && bEnd.isAfter(slotStart);
    });

    if (existingBooking) {
      return { isBooked: true, bookingInfo: existingBooking };
    }
    return { isBooked: false, bookingInfo: null };
  };

  // Render cell cho Ant Design Calendar
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

          const statusInfo = adminStatusConfig[item.status] || adminStatusConfig.PENDING;

          const teacherName = item.user?.fullName || item.userName || 'Giảng viên';

          const content = (
            <div style={{ maxWidth: 260 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{item.purpose || 'Mượn phòng'}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>
                <ClockCircleOutlined /> Khung giờ: <b>{startTimeDisplay} - {endTimeDisplay}</b>
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: 12 }}>
                <UserOutlined /> Người đặt: <b>{teacherName}</b>
              </p>
              <div style={{ marginTop: 8 }}>
                <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
              </div>
            </div>
          );

          return (
            <li key={item.id} style={{ marginBottom: 3 }}>
              <Popover content={content} title="Chi tiết yêu cầu" trigger="hover">
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
                    {startTimeDisplay} - {teacherName}: {item.purpose || 'Đã đặt'}
                  </span>
                </div>
              </Popover>
            </li>
          );
        })}
        {listData.length > 3 && (
          <li style={{ fontSize: 11, color: '#1890ff', textAlign: 'center', marginTop: 2 }}>
            + Xem thêm {listData.length - 3} lịch...
          </li>
        )}
      </ul>
    );
  };

  const cellRender: CalendarProps<Dayjs>['cellRender'] = (current, info) => {
    if (info.type === 'date') return dateCellRender(current);
    return info.originNode;
  };

  // Chọn ngày trên Calendar
  const handleSelectDate = (date: Dayjs) => {
    setSelectedDate(date);
    setIsDayModalOpen(true);
  };

  // Admin Duyệt / Từ chối booking trực tiếp
  const handleUpdateStatus = async (id: number, status: 'approve' | 'reject') => {
    try {
      if (status === 'approve') {
        await bookingApi.approve(id);
        message.success('Đã duyệt yêu cầu thành công!');
      } else {
        await bookingApi.reject(id);
        message.success('Đã từ chối yêu cầu!');
      }
      fetchRoomBookings();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  // Admin Xóa booking
  const handleDeleteBooking = async (id: number) => {
    try {
      await bookingApi.delete(id);
      message.success('Đã xóa lịch mượn phòng!');
      fetchRoomBookings();
    } catch {
      message.error('Xóa lịch mượn thất bại');
    }
  };

  // Mở modal tạo lịch mượn mới
  const handleOpenAddModal = (date?: Dayjs) => {
    const targetDate = date || selectedDate || dayjs();
    form.setFieldsValue({
      roomId: selectedRoomId,
      bookingDate: targetDate,
    });
    setIsAddModalOpen(true);
  };

  // Tự động điền giờ khi chọn tiết học
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

  // Xử lý submit form tạo mới
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
        purpose: values.purpose,
        status: 'APPROVED' // Admin tạo lịch thì mặc định Approved
      };

      if (values.timeSlotId) {
        payload.timeSlot = { id: values.timeSlotId };
      }

      await bookingApi.create(payload);
      message.success('Đã thêm lịch mượn phòng thành công!');
      setIsAddModalOpen(false);
      form.resetFields();
      fetchRoomBookings();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo lịch mượn!');
    }
  };

  const pendingCount = bookings.filter(b => b.status === 'PENDING').length;
  const approvedCount = bookings.filter(b => b.status === 'APPROVED').length;
  const rejectedCount = bookings.filter(b => b.status === 'REJECTED' || b.status === 'CANCELLED').length;

  const selectedDayBookings = selectedDate ? getBookingsByDate(selectedDate) : [];

  return (
    <div style={{ padding: 16 }}>
      {/* Header Bar */}
      <Card style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Space direction="vertical" size={4}>
              <Title level={4} style={{ margin: 0 }}>
                <CalendarOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                Quản lý Lịch phòng máy
              </Title>
              <Text type="secondary">
                Xem lịch trực quan dạng Lịch, duyệt/từ chối yêu cầu và quản lý thời gian sử dụng phòng máy
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Select
                style={{ width: 240 }}
                placeholder="Chọn phòng máy"
                value={selectedRoomId}
                onChange={(val) => setSelectedRoomId(val)}
                options={rooms.map(r => ({
                  value: r.id,
                  label: `${r.roomName} (${r.location || 'Khu Lab'})`
                }))}
              />
              <Select
                style={{ width: 150 }}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'PENDING', label: 'Chờ duyệt' },
                  { value: 'APPROVED', label: 'Đã duyệt' },
                  { value: 'REJECTED', label: 'Từ chối' },
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={fetchRoomBookings} loading={loading}>
                Làm mới
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenAddModal()}>
                Thêm lịch
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Dynamic Metric Banner */}
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
                title="Yêu cầu chờ duyệt"
                value={pendingCount}
                valueStyle={{ color: '#faad14', fontWeight: 600 }}
                prefix={<SyncOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Đã duyệt"
                value={approvedCount}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Từ chối / Hủy"
                value={rejectedCount}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
          </Row>
        )}
      </Card>

      {/* Main Calendar / Weekly Schedule View */}
      <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space align="center" wrap>
            <Text strong style={{ fontSize: 14 }}>Chế độ xem:</Text>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'month' | 'week')}
              options={[
                { label: '🗓️ Lịch Tháng (Calendar)', value: 'month' },
                { label: '📅 Lịch Tuần (Thời khóa biểu)', value: 'week' },
              ]}
            />
          </Space>

          {viewMode === 'month' ? (
            <Space wrap size={12} style={{ fontSize: 12 }}>
              <Text strong>Trạng thái:</Text>
              <Tag color="gold"><Badge status="warning" /> Chờ duyệt ({pendingCount})</Tag>
              <Tag color="green"><Badge status="success" /> Đã duyệt ({approvedCount})</Tag>
              <Tag color="red"><Badge status="error" /> Từ chối ({rejectedCount})</Tag>
            </Space>
          ) : (
            <Space wrap align="center">
              <Button
                icon={<LeftOutlined />}
                onClick={() => setSelectedWeekStart(prev => prev.subtract(1, 'week'))}
              >
                Tuần trước
              </Button>
              <Button
                onClick={() => setSelectedWeekStart(getMonday(dayjs()))}
                type={selectedWeekStart.isSame(getMonday(dayjs()), 'day') ? 'primary' : 'default'}
              >
                Tuần này
              </Button>
              <Button
                onClick={() => setSelectedWeekStart(prev => prev.add(1, 'week'))}
              >
                Tuần sau <RightOutlined />
              </Button>
              <DatePicker
                picker="week"
                format="[Tuần] ww (YYYY)"
                onChange={(date) => {
                  if (date) setSelectedWeekStart(getMonday(date));
                }}
                style={{ width: 150 }}
              />
            </Space>
          )}
        </div>

        {viewMode === 'month' ? (
          <Calendar
            cellRender={cellRender}
            onSelect={handleSelectDate}
          />
        ) : (
          <div>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: 14, color: '#1677ff' }}>
                <CalendarOutlined style={{ marginRight: 6 }} />
                Thời khóa biểu tuần: Từ {getMonday(selectedWeekStart).format('DD/MM/YYYY')} đến {getMonday(selectedWeekStart).add(6, 'day').format('DD/MM/YYYY')}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Bấm vào ô trống để duyệt hoặc đặt phòng cho ngày đó
              </Text>
            </div>

            <Table
              bordered
              pagination={false}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1000 }}
              dataSource={timeSlots}
              columns={[
                {
                  title: 'Tiết học / Khung giờ',
                  key: 'timeSlot',
                  width: 140,
                  fixed: 'left',
                  render: (_, record: TimeSlot) => (
                    <div style={{ textAlign: 'center' }}>
                      <Text strong style={{ color: '#1677ff', display: 'block' }}>{record.slotName}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.startTime?.substring(0, 5)} - {record.endTime?.substring(0, 5)}
                      </Text>
                    </div>
                  )
                },
                ...Array.from({ length: 7 }, (_, i) => {
                  const dayObj = getMonday(selectedWeekStart).add(i, 'day');
                  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
                  const isToday = dayObj.isSame(dayjs(), 'day');

                  return {
                    title: (
                      <div style={{ textAlign: 'center', backgroundColor: isToday ? '#e6f4ff' : 'transparent', padding: '4px 0', borderRadius: 4 }}>
                        <Text strong style={{ color: isToday ? '#1677ff' : '#262626', display: 'block' }}>
                          {dayNames[i]}
                        </Text>
                        <Text style={{ fontSize: 12, color: isToday ? '#1677ff' : '#8c8c8c' }}>
                          {dayObj.format('DD/MM')}
                        </Text>
                        {isToday && <Tag color="blue" style={{ fontSize: 10, margin: '2px 0 0 0' }}>Hôm nay</Tag>}
                      </div>
                    ),
                    key: `day_${i}`,
                    align: 'center' as const,
                    render: (_: any, slot: TimeSlot) => {
                      const { isBooked, bookingInfo } = checkSlotStatus(slot, dayObj);

                      if (isBooked && bookingInfo) {
                        const statusMeta = adminStatusConfig[bookingInfo.status as BookingStatus] || adminStatusConfig.PENDING;
                        return (
                          <Popover
                            title="Chi tiết đơn mượn (Admin)"
                            content={
                              <div style={{ maxWidth: 260 }}>
                                <p style={{ margin: 0, fontWeight: 600 }}>{bookingInfo.purpose || 'Mượn phòng'}</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>
                                  👤 Người mượn: <b>{bookingInfo.user?.fullName || bookingInfo.userName || 'Giáo viên'}</b>
                                </p>
                                <p style={{ margin: '2px 0 0 0', fontSize: 12 }}>
                                  ⏰ Giờ: <b>{slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)}</b>
                                </p>
                                <div style={{ marginTop: 8 }}>
                                  <Tag color={statusMeta.color}>{statusMeta.text}</Tag>
                                </div>
                              </div>
                            }
                          >
                            <div
                              onClick={() => {
                                setSelectedDate(dayObj);
                                setIsDayModalOpen(true);
                              }}
                              style={{
                                padding: '6px 8px',
                                borderRadius: 6,
                                background: bookingInfo.status === 'APPROVED' ? '#f6ffed' : '#fffbe6',
                                border: `1px solid ${bookingInfo.status === 'APPROVED' ? '#b7eb8f' : '#ffe58f'}`,
                                fontSize: 12,
                                textAlign: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <Tag color={statusMeta.color} style={{ margin: 0, fontSize: 10 }}>
                                {statusMeta.text}
                              </Tag>
                              <div style={{ fontWeight: 600, marginTop: 4, color: '#262626', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {bookingInfo.purpose || 'Đã có lịch'}
                              </div>
                              <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                                {bookingInfo.user?.fullName || bookingInfo.userName || ''}
                              </div>
                            </div>
                          </Popover>
                        );
                      }

                      return (
                        <div
                          onClick={() => {
                            setSelectedDate(dayObj);
                            form.setFieldsValue({
                              roomId: selectedRoomId,
                              bookingDate: dayObj,
                              timeSlotId: slot.id
                            });
                            handleTimeSlotChange(slot.id);
                            setIsAddModalOpen(true);
                          }}
                          style={{
                            padding: '8px 4px',
                            borderRadius: 6,
                            background: '#fafafa',
                            border: '1px dashed #d9d9d9',
                            fontSize: 12,
                            color: '#52c41a',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          <PlusOutlined style={{ marginRight: 4 }} />
                          Tạo mượn
                        </div>
                      );
                    }
                  };
                })
              ]}
            />
          </div>
        )}
      </Card>

      {/* Modal chi tiết lịch của Ngày được chọn */}
      <Modal
        title={
          <span>
            <CalendarOutlined style={{ color: '#1890ff', marginRight: 8 }} />
            Quản lý lịch mượn ngày {selectedDate ? selectedDate.format('DD/MM/YYYY') : ''}
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
            Thêm lịch mượn ngày này
          </Button>
        ]}
        width={680}
      >
        {selectedDayBookings.length === 0 ? (
          <Empty description="Không có lịch đặt phòng nào trong ngày này" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {selectedDayBookings.map((b) => {
              const statusInfo = adminStatusConfig[b.status] || adminStatusConfig.PENDING;
              const startTimeStr = b.startTime?.includes('T') ? b.startTime.split('T')[1]?.substring(0, 5) : b.startTime?.substring(0, 5);
              const endTimeStr = b.endTime?.includes('T') ? b.endTime.split('T')[1]?.substring(0, 5) : b.endTime?.substring(0, 5);
              const teacherName = b.user?.fullName || b.userName || 'Giảng viên';

              return (
                <Card
                  key={b.id}
                  size="small"
                  style={{
                    borderLeft: `4px solid ${statusInfo.color === 'green' ? '#52c41a' : statusInfo.color === 'gold' ? '#faad14' : '#ff4d4f'}`
                  }}
                >
                  <Row justify="space-between" align="middle">
                    <Col span={14}>
                      <Text strong style={{ fontSize: 15 }}>{b.purpose || 'Mượn phòng máy'}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        Thời gian: <b>{startTimeStr} - {endTimeStr}</b>
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        <UserOutlined style={{ marginRight: 4 }} />
                        Người đặt: <b>{teacherName}</b> {b.user?.email ? `(${b.user.email})` : ''}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Tag color={statusInfo.color} icon={statusInfo.icon}>
                          {statusInfo.text}
                        </Tag>
                      </div>
                    </Col>

                    <Col span={10} style={{ textAlign: 'right' }}>
                      <Space wrap>
                        {b.status === 'PENDING' && (
                          <>
                            <Button
                              type="primary"
                              size="small"
                              icon={<CheckOutlined />}
                              onClick={() => handleUpdateStatus(b.id, 'approve')}
                            >
                              Duyệt
                            </Button>
                            <Button
                              danger
                              size="small"
                              icon={<CloseOutlined />}
                              onClick={() => handleUpdateStatus(b.id, 'reject')}
                            >
                              Từ chối
                            </Button>
                          </>
                        )}
                        <Popconfirm title="Xóa lịch mượn này?" onConfirm={() => handleDeleteBooking(b.id)}>
                          <Button danger size="small" type="text" icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Modal Admin thêm lịch mượn */}
      <Modal
        title="Thêm lịch mượn phòng máy (Admin)"
        open={isAddModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsAddModalOpen(false)}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateBooking}>
          <Form.Item name="roomId" label="Phòng máy" rules={[{ required: true, message: 'Chọn phòng máy!' }]}>
            <Select placeholder="Chọn phòng máy">
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

          <Form.Item name="bookingDate" label="Ngày mượn" rules={[{ required: true, message: 'Chọn ngày!' }]}>
            <DatePicker style={{ width: '100%' }} minDate={dayjs()} />
          </Form.Item>

          <Form.Item name="timeRange" label="Khung giờ mượn" rules={[{ required: true, message: 'Chọn khung giờ!' }]}>
            <RangePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="purpose" label="Mục đích mượn / Tên lớp" rules={[{ required: true, message: 'Nhập mục đích!' }]}>
            <Input.TextArea placeholder="Ví dụ: Đặt lịch thi học kỳ môn Lập trình Web" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminRoomSchedule;
