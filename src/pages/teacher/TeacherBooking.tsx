import React, { useState, useEffect, useMemo } from 'react';
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
  Select,
  Spin,
  Segmented,
  Radio,
  InputNumber,
  Switch,
  Alert
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
  SendOutlined,
  InfoCircleOutlined,
  RollbackOutlined,
  LeftOutlined,
  RightOutlined,
  FileExcelOutlined,
  SyncOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ThunderboltFilled,
  CheckOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { bookingApi, type Booking, type BookingStatus } from '../../api/booking';
import { roomApi, type Room } from '../../api/room';
import { timeSlotApi, type TimeSlot } from '../../api/timeSlot';
import { BookingImportModal } from '../../components/admin/BookingImportModal';

const { Title, Text } = Typography;
const { RangePicker: DateRangePicker } = DatePicker;
const { RangePicker: TimeRangePicker } = TimePicker;

// Cấu hình các Thứ trong tuần (chuẩn Việt Nam: 2 = Thứ 2 ... 8 = Chủ Nhật)
const DAY_OF_WEEK_OPTIONS = [
  { value: 2, label: 'Thứ 2' },
  { value: 3, label: 'Thứ 3' },
  { value: 4, label: 'Thứ 4' },
  { value: 5, label: 'Thứ 5' },
  { value: 6, label: 'Thứ 6' },
  { value: 7, label: 'Thứ 7' },
  { value: 8, label: 'Chủ Nhật' },
];

const DAY_NAMES_MAP: Record<number, string> = {
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
  8: 'Chủ Nhật',
};

// Ca học & Tiết học tiêu chuẩn trường Đại học Vinh
const STANDARD_PERIOD_PRESETS = [
  { id: 'p1_3', label: 'Tiết 1 - 3 (07:00 - 09:25)', start: '07:00', end: '09:25', group: 'Sáng' },
  { id: 'p3_5', label: 'Tiết 3 - 5 (08:40 - 11:05)', start: '08:40', end: '11:05', group: 'Sáng' },
  { id: 'p1_5', label: 'Tiết 1 - 5 (07:00 - 11:05)', start: '07:00', end: '11:05', group: 'Sáng' },
  { id: 'p6_8', label: 'Tiết 6 - 8 (13:00 - 15:25)', start: '13:00', end: '15:25', group: 'Chiều' },
  { id: 'p8_10', label: 'Tiết 8 - 10 (14:40 - 17:05)', start: '14:40', end: '17:05', group: 'Chiều' },
  { id: 'p6_10', label: 'Tiết 6 - 10 (13:00 - 17:05)', start: '13:00', end: '17:05', group: 'Chiều' },
  { id: 'p11_12', label: 'Tiết 11 - 12 (17:15 - 18:50)', start: '17:15', end: '18:50', group: 'Tối' },
];

const WEEKS_PRESETS = [
  { weeks: 4, label: '4 tuần' },
  { weeks: 8, label: '8 tuần (Nửa HK)' },
  { weeks: 10, label: '10 tuần' },
  { weeks: 15, label: '15 tuần (Chuẩn Học kỳ ĐH Vinh)' },
];

// Chuyển đổi dayjs sang thứ VN (1..7 -> 2..8)
const getVNday = (d: dayjs.Dayjs): number => {
  const jsDay = d.day(); // 0=Sun, 1=Mon, ..., 6=Sat
  return jsDay === 0 ? 8 : jsDay + 1;
};

interface GeneratedSession {
  key: string;
  dateStr: string;
  displayDate: string;
  dayOfWeek: number;
  dayOfWeekText: string;
  isBooked: boolean;
  bookingInfo?: any;
}

const TeacherBooking: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('history');

  // Selected state for Visual Booking Form
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);
  const [selectedSlotId, setSelectedSlotId] = useState<number | undefined>(undefined);

  // Helper lấy Thứ 2 của tuần chứa ngày d
  const getMonday = (d: dayjs.Dayjs) => {
    const day = d.day();
    if (day === 0) return d.subtract(6, 'day');
    return d.subtract(day - 1, 'day');
  };

  const [selectedWeekStart, setSelectedWeekStart] = useState<dayjs.Dayjs>(getMonday(dayjs()));
  const [selectedCheckDate, setSelectedCheckDate] = useState<dayjs.Dayjs>(dayjs());
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [roomBookingsLoading, setRoomBookingsLoading] = useState(false);

  // State cho phân trang và filter
  const [myBookingsPage, setMyBookingsPage] = useState<number>(1);
  const [myBookingsPageSize, setMyBookingsPageSize] = useState<number>(6);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // ==========================================
  // STATE ĐẶT LỊCH XOAY TUẦN HOÀN (RECURRING BOOKING)
  // ==========================================
  const [bookingType, setBookingType] = useState<'SINGLE' | 'RECURRING'>('SINGLE');
  const [recurringRangeType, setRecurringRangeType] = useState<'WEEKS_COUNT' | 'DATE_RANGE'>('WEEKS_COUNT');
  const [recurringStartDate, setRecurringStartDate] = useState<dayjs.Dayjs>(dayjs());
  const [recurringDateRange, setRecurringDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs(),
    dayjs().add(15, 'week').subtract(1, 'day')
  ]);
  const [weeksCount, setWeeksCount] = useState<number>(15);
  const [recurringDaysOfWeek, setRecurringDaysOfWeek] = useState<number[]>([getVNday(dayjs())]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>('p1_3');
  const [skipConflicts, setSkipConflicts] = useState<boolean>(true);

  const [form] = Form.useForm();

  // Tải danh sách các đơn mượn của phòng máy đang chọn để kiểm tra khung giờ trống
  const fetchRoomBookings = async (roomId: number) => {
    if (!roomId) return;
    setRoomBookingsLoading(true);
    try {
      const res = await bookingApi.search({
        filter: `room.id==${roomId}`,
        page: 0,
        size: 1000,
        sort: ['startTime,asc']
      });
      setRoomBookings(res.data.content || []);
    } catch {
      // Bỏ qua lỗi nếu có
    } finally {
      setRoomBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRoomId) {
      fetchRoomBookings(selectedRoomId);
    }
  }, [selectedRoomId]);

  // Kiểm tra 1 tiết học/khung giờ có bị bận/trùng lịch hay không
  const checkSlotStatus = (slot: TimeSlot, checkDate: dayjs.Dayjs = selectedCheckDate) => {
    if (!slot.startTime || !slot.endTime || !roomBookings || roomBookings.length === 0) {
      return { isBooked: false, bookingInfo: null };
    }

    const dateStr = checkDate.format('YYYY-MM-DD');
    const slotStartStr = `${dateStr}T${slot.startTime.substring(0, 5)}:00`;
    const slotEndStr = `${dateStr}T${slot.endTime.substring(0, 5)}:00`;
    const slotStart = dayjs(slotStartStr);
    const slotEnd = dayjs(slotEndStr);

    const existingBooking = roomBookings.find((b: any) => {
      if (b.status === 'REJECTED' || b.status === 'CANCELLED' || b.status === 'RETURNED') {
        return false;
      }
      const bStart = dayjs(b.startTime);
      const bEnd = dayjs(b.endTime);

      return bStart.isBefore(slotEnd) && bEnd.isAfter(slotStart);
    });

    if (existingBooking) {
      return { isBooked: true, bookingInfo: existingBooking };
    }
    return { isBooked: false, bookingInfo: null };
  };

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getMyBookings({
        page: 0,
        size: 500
      });
      const list = res.data?.content || (Array.isArray(res.data) ? res.data : []);
      setData(list);
    } catch {
      message.error('Không thể tải lịch sử mượn phòng');
    } finally {
      setLoading(false);
    }
  };

  // Lọc lịch sử mượn phòng theo trạng thái
  const filteredMyBookings = useMemo(() => {
    if (!statusFilter || statusFilter === 'ALL') return data;
    return data.filter(item => item.status === statusFilter);
  }, [data, statusFilter]);

  useEffect(() => {
    fetchMyBookings();
    roomApi.getAll().then(res => {
      const roomList = Array.isArray(res.data) ? res.data : (res.data as any)?.content || [];
      setRooms(roomList);
      if (roomList.length > 0) {
        setSelectedRoomId(roomList[0].id);
        form.setFieldsValue({ roomId: roomList[0].id });
      }
    }).catch(() => {});

    timeSlotApi.getAll().then(res => {
      const slotList = Array.isArray(res.data) ? res.data : (res.data as any)?.content || [];
      setTimeSlots(slotList);
    }).catch(() => {});

    // Khởi tạo giá trị mặc định cho form
    const defaultStart = dayjs(`2000-01-01 07:00`, 'YYYY-MM-DD HH:mm');
    const defaultEnd = dayjs(`2000-01-01 09:25`, 'YYYY-MM-DD HH:mm');
    form.setFieldsValue({
      bookingType: 'SINGLE',
      bookingDate: dayjs(),
      timeRange: [defaultStart, defaultEnd],
      recurringRangeType: 'WEEKS_COUNT',
      recurringStartDate: dayjs(),
      weeksCount: 15,
      recurringDaysOfWeek: [getVNday(dayjs())]
    });
  }, []);

  // Chọn ca học chuẩn từ Preset
  const handleApplyPreset = (preset: typeof STANDARD_PERIOD_PRESETS[0]) => {
    setSelectedPresetId(preset.id);
    const startDay = dayjs(`2000-01-01 ${preset.start}`, 'YYYY-MM-DD HH:mm');
    const endDay = dayjs(`2000-01-01 ${preset.end}`, 'YYYY-MM-DD HH:mm');
    form.setFieldsValue({ timeRange: [startDay, endDay] });
  };

  // Chọn tiết học từ Ma trận Tiết học Chips
  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlotId(slot.id);
    setSelectedPresetId(null);
    form.setFieldsValue({ timeSlotId: slot.id });

    if (!form.getFieldValue('bookingDate')) {
      form.setFieldsValue({ bookingDate: selectedCheckDate });
    }

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
    fetchRoomBookings(roomId);
  };

  // Tính toán danh sách các buổi học được sinh ra khi đặt xoay tuần hoàn
  const calculatedRecurringSessions = useMemo<GeneratedSession[]>(() => {
    if (bookingType !== 'RECURRING') return [];

    let start = recurringRangeType === 'WEEKS_COUNT'
      ? (recurringStartDate || dayjs())
      : (recurringDateRange?.[0] || dayjs());

    let end = recurringRangeType === 'WEEKS_COUNT'
      ? (recurringStartDate || dayjs()).add(weeksCount || 15, 'week').subtract(1, 'day')
      : (recurringDateRange?.[1] || dayjs().add(15, 'week'));

    if (!start || !end || !start.isValid() || !end.isValid() || start.isAfter(end) || recurringDaysOfWeek.length === 0) {
      return [];
    }

    const timeRange = form.getFieldValue('timeRange');
    const startH = timeRange && timeRange[0] ? timeRange[0].format('HH:mm:ss') : '07:00:00';
    const endH = timeRange && timeRange[1] ? timeRange[1].format('HH:mm:ss') : '09:25:00';

    const sessions: GeneratedSession[] = [];
    let curr = start.startOf('day');
    const endLimit = end.endOf('day');

    while (curr.isBefore(endLimit) || curr.isSame(endLimit, 'day')) {
      const vnDay = getVNday(curr);
      if (recurringDaysOfWeek.includes(vnDay)) {
        const dateStr = curr.format('YYYY-MM-DD');

        // Conflict check với các đơn mượn của phòng hiện tại
        let isBooked = false;
        let bookingInfo: any = null;

        if (roomBookings && roomBookings.length > 0) {
          const sessionStart = dayjs(`${dateStr}T${startH}`);
          const sessionEnd = dayjs(`${dateStr}T${endH}`);

          const found = roomBookings.find((b: any) => {
            if (b.status === 'REJECTED' || b.status === 'CANCELLED' || b.status === 'RETURNED') {
              return false;
            }
            const bStart = dayjs(b.startTime);
            const bEnd = dayjs(b.endTime);
            return bStart.isBefore(sessionEnd) && bEnd.isAfter(sessionStart);
          });

          if (found) {
            isBooked = true;
            bookingInfo = found;
          }
        }

        sessions.push({
          key: `${dateStr}_${startH}_${endH}`,
          dateStr,
          displayDate: curr.format('DD/MM/YYYY'),
          dayOfWeek: vnDay,
          dayOfWeekText: DAY_NAMES_MAP[vnDay] || `Thứ ${vnDay}`,
          isBooked,
          bookingInfo
        });
      }
      curr = curr.add(1, 'day');
    }

    return sessions;
  }, [
    bookingType,
    recurringRangeType,
    recurringStartDate,
    recurringDateRange,
    weeksCount,
    recurringDaysOfWeek,
    roomBookings,
    form.getFieldValue('timeRange')
  ]);

  const validSessions = calculatedRecurringSessions.filter(s => !s.isBooked);
  const conflictSessions = calculatedRecurringSessions.filter(s => s.isBooked);

  // Xử lý gửi Form đăng ký mượn (Hỗ trợ cả Đơn lẻ và Xoay tuần hoàn)
  const handleCreate = async (values: any) => {
    const isRecurring = bookingType === 'RECURRING';

    // 1. Chế độ đặt 1 buổi đơn lẻ
    if (!isRecurring) {
      try {
        if (!values.bookingDate) {
          message.error('Vui lòng chọn ngày mượn phòng');
          return;
        }
        if (!values.timeRange || !values.timeRange[0] || !values.timeRange[1]) {
          message.error('Vui lòng chọn khung giờ mượn');
          return;
        }

        const bookingDate = values.bookingDate.format('YYYY-MM-DD');
        const start = values.timeRange[0].format('HH:mm:ss');
        const end = values.timeRange[1].format('HH:mm:ss');

        const payload: any = {
          room: { id: values.roomId || selectedRoomId },
          roomId: values.roomId || selectedRoomId,
          startTime: `${bookingDate}T${start}`,
          endTime: `${bookingDate}T${end}`,
          purpose: values.purpose || 'Thực hành môn học',
          status: 'PENDING'
        };

        if (values.timeSlotId) {
          payload.timeSlot = { id: values.timeSlotId };
        }

        await bookingApi.create(payload);

        message.success('Gửi yêu cầu mượn phòng thành công!');
        form.resetFields();
        setIsModalOpen(false);
        fetchMyBookings();
        if (selectedRoomId) fetchRoomBookings(selectedRoomId);
      } catch (error: any) {
        message.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn mượn!');
      }
      return;
    }

    // 2. Chế độ đặt xoay tuần hoàn theo TKB nhà trường
    try {
      if (!values.timeRange || !values.timeRange[0] || !values.timeRange[1]) {
        message.error('Vui lòng chọn khung giờ mượn phòng');
        return;
      }

      if (recurringDaysOfWeek.length === 0) {
        message.error('Vui lòng chọn ít nhất một Thứ trong tuần để lặp lại');
        return;
      }

      if (calculatedRecurringSessions.length === 0) {
        message.warning('Không có buổi học nào phù hợp với chu kỳ và Thứ đã chọn');
        return;
      }

      // Xác định danh sách buổi học sẽ gửi
      const sessionsToBook = skipConflicts ? validSessions : calculatedRecurringSessions;

      if (sessionsToBook.length === 0) {
        message.error('Tất cả các buổi học trong chu kỳ đều bị trùng lịch! Vui lòng chọn phòng hoặc khung giờ khác.');
        return;
      }

      const start = values.timeRange[0].format('HH:mm:ss');
      const end = values.timeRange[1].format('HH:mm:ss');
      const targetRoomId = values.roomId || selectedRoomId;
      const basePurpose = values.purpose?.trim() || 'Thực hành môn học (Lịch TKB tuần hoàn)';

      const bookingPayloads: Partial<Booking>[] = sessionsToBook.map(session => ({
        room: { id: targetRoomId } as any,
        roomId: targetRoomId,
        bookingDate: session.dateStr,
        startTime: `${session.dateStr}T${start}`,
        endTime: `${session.dateStr}T${end}`,
        purpose: `${basePurpose} - ${session.dayOfWeekText}`,
        status: 'PENDING',
        timeSlot: values.timeSlotId ? { id: values.timeSlotId } as any : undefined
      }));

      setLoading(true);
      let saveAllSuccess = false;

      try {
        await bookingApi.saveAll(bookingPayloads);
        saveAllSuccess = true;
      } catch {
        saveAllSuccess = false;
      }

      // Fallback: nếu saveAll chưa hỗ trợ, gửi theo batch nhỏ
      if (!saveAllSuccess) {
        let successCount = 0;
        let failCount = 0;
        const CHUNK_SIZE = 10;

        for (let i = 0; i < bookingPayloads.length; i += CHUNK_SIZE) {
          const chunk = bookingPayloads.slice(i, i + CHUNK_SIZE);
          const results = await Promise.allSettled(chunk.map(item => bookingApi.create(item)));
          results.forEach(res => {
            if (res.status === 'fulfilled') successCount++;
            else failCount++;
          });
        }

        if (failCount > 0) {
          message.warning(
            `Đã gửi yêu cầu: ${successCount}/${bookingPayloads.length} buổi thành công (${failCount} buổi bị trùng lịch hoặc lỗi)`
          );
        } else {
          message.success(`Đã gửi yêu cầu mượn thành công toàn bộ ${successCount} buổi học xoay tuần hoàn!`);
        }
      } else {
        message.success(`Đã gửi yêu cầu mượn thành công toàn bộ ${bookingPayloads.length} buổi học xoay tuần hoàn!`);
      }

      setIsModalOpen(false);
      form.resetFields();
      fetchMyBookings();
      if (selectedRoomId) fetchRoomBookings(selectedRoomId);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo lịch xoay tuần hoàn!');
    } finally {
      setLoading(false);
    }
  };

  const statusMap: Record<BookingStatus, { color: string; text: string; icon: React.ReactNode }> = {
    PENDING: { color: 'gold', text: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
    APPROVED: { color: 'green', text: 'Đã duyệt', icon: <CheckCircleOutlined /> },
    REJECTED: { color: 'red', text: 'Từ chối', icon: <StopOutlined /> },
    CANCELLED: { color: 'gray', text: 'Đã hủy', icon: <StopOutlined /> },
    RETURNED: { color: 'cyan', text: 'Đã trả phòng', icon: <CheckCircleOutlined /> },
  };

  const selectedRoomObj = rooms.find(r => r.id === (form.getFieldValue('roomId') || selectedRoomId));
  const selectedSlotObj = timeSlots.find(s => s.id === (form.getFieldValue('timeSlotId') || selectedSlotId));
  const formBookingDate = form.getFieldValue('bookingDate');
  const formTimeRange = form.getFieldValue('timeRange');

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 65,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (myBookingsPage - 1) * myBookingsPageSize + index + 1,
    },
    {
      title: 'Phòng máy',
      key: 'room',
      sorter: (a: any, b: any) => {
        const nameA = a.room?.roomName || a.roomName || '';
        const nameB = b.room?.roomName || b.roomName || '';
        return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
      },
      render: (record: any) => (
        <Space>
          <DesktopOutlined style={{ color: '#1677ff', fontSize: 16 }} />
          <div>
            <Text strong>{record.room?.roomName || record.roomName || 'N/A'}</Text>
            {record.room?.location && (
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>{record.room.location}</div>
            )}
          </div>
        </Space>
      )
    },
    {
      title: 'Ngày mượn',
      dataIndex: 'bookingDate',
      key: 'bookingDate',
      sorter: (a: any, b: any) => {
        const dateA = a.bookingDate || (a.startTime?.includes('T') ? a.startTime.split('T')[0] : a.startTime) || '';
        const dateB = b.bookingDate || (b.startTime?.includes('T') ? b.startTime.split('T')[0] : b.startTime) || '';
        return dateA.localeCompare(dateB);
      },
      defaultSortOrder: 'descend' as const,
      render: (dateStr: string, record: any) => {
        const actualDate = dateStr || (record.startTime?.includes('T') ? record.startTime.split('T')[0] : record.startTime);
        return (
          <Space>
            <CalendarOutlined style={{ color: '#1677ff' }} />
            <Text strong>{actualDate ? dayjs(actualDate).format('DD/MM/YYYY') : '---'}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Khung giờ / Tiết học',
      key: 'time',
      sorter: (a: any, b: any) => {
        const timeA = a.startTime?.includes('T') ? a.startTime.split('T')[1] : a.startTime || '';
        const timeB = b.startTime?.includes('T') ? b.startTime.split('T')[1] : b.startTime || '';
        return timeA.localeCompare(timeB);
      },
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
      title: 'Mục đích / Học phần',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
      sorter: (a: any, b: any) => (a.purpose || '').localeCompare(b.purpose || '', 'vi', { sensitivity: 'base' }),
      render: (text: string) => <span>{text || 'Thực hành môn học'}</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      sorter: (a: any, b: any) => (a.status || '').localeCompare(b.status || ''),
      render: (status: BookingStatus) => {
        const item = statusMap[status] || statusMap.PENDING;
        return <Tag color={item.color} icon={item.icon}>{item.text}</Tag>;
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 130,
      render: (record: any) => (
        <Space wrap>
          {record.status === 'PENDING' && (
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
          )}
          {record.status === 'APPROVED' && (
            <Popconfirm
              title="Xác nhận trả phòng máy này?"
              onConfirm={() => bookingApi.returnRoom(record.id).then(() => {
                message.success('Đã trả phòng thành công!');
                fetchMyBookings();
              }).catch((err: any) => {
                message.error(err.response?.data?.message || 'Trả phòng thất bại!');
              })}
              okText="Trả phòng"
              cancelText="Đóng"
            >
              <Button type="primary" ghost size="small" icon={<RollbackOutlined />}>
                Trả phòng
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const morningSlots = timeSlots.filter(s => parseInt(s.startTime?.substring(0, 2) || '0', 10) < 12);
  const afternoonSlots = timeSlots.filter(s => parseInt(s.startTime?.substring(0, 2) || '0', 10) >= 12);

  // ==========================================
  // FORM COMPONENTS PHỤ CHO RECURRING BOOKING
  // ==========================================
  // ==========================================
  // FORM COMPONENTS PHỤ CHO RECURRING BOOKING (NÂNG CẤP GIAO DIỆN HIỆN ĐẠI)
  // ==========================================
  const renderRecurringConfig = () => (
    <div style={{
      background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)',
      padding: 16,
      borderRadius: 12,
      border: '1px solid #bae0ff',
      marginBottom: 16,
      boxShadow: '0 2px 8px rgba(22, 119, 255, 0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space align="center">
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#1677ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <SyncOutlined spin style={{ fontSize: 14 }} />
          </div>
          <div>
            <Text strong style={{ color: '#0958d9', fontSize: 14, display: 'block' }}>
              Cấu hình đặt lịch xoay tuần hoàn (TKB)
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Áp dụng cho học phần thực hành kéo dài nhiều tuần của trường
            </Text>
          </div>
        </Space>
      </div>

      {/* Block 1: Phương thức áp dụng chu kỳ */}
      <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e6f4ff', marginBottom: 12 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={10}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6, color: '#434343' }}>
              📌 Cách thức tính chu kỳ:
            </Text>
            <Radio.Group
              value={recurringRangeType}
              onChange={(e) => setRecurringRangeType(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="WEEKS_COUNT">Theo số tuần</Radio.Button>
              <Radio.Button value="DATE_RANGE">Khoảng ngày</Radio.Button>
            </Radio.Group>
          </Col>

          {recurringRangeType === 'WEEKS_COUNT' ? (
            <>
              <Col xs={12} sm={7}>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4, color: '#434343' }}>
                  Ngày bắt đầu:
                </Text>
                <DatePicker
                  value={recurringStartDate}
                  onChange={(date) => {
                    if (date) {
                      setRecurringStartDate(date);
                      const startDayVN = getVNday(date);
                      if (!recurringDaysOfWeek.includes(startDayVN)) {
                        setRecurringDaysOfWeek([startDayVN]);
                      }
                    }
                  }}
                  minDate={dayjs()}
                  format="YYYY-MM-DD"
                  style={{ width: '100%' }}
                  size="middle"
                />
              </Col>
              <Col xs={12} sm={7}>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4, color: '#434343' }}>
                  Số tuần lặp:
                </Text>
                <InputNumber
                  min={1}
                  max={30}
                  value={weeksCount}
                  onChange={(val) => setWeeksCount(val || 15)}
                  style={{ width: '100%' }}
                  addonAfter="tuần"
                />
              </Col>
              <Col span={24} style={{ marginTop: 2 }}>
                <Space wrap size={[6, 6]} align="center">
                  <Text type="secondary" style={{ fontSize: 11 }}>⚡ Chọn nhanh số tuần:</Text>
                  {WEEKS_PRESETS.map(p => (
                    <Tag.CheckableTag
                      key={p.weeks}
                      checked={weeksCount === p.weeks}
                      onChange={() => setWeeksCount(p.weeks)}
                      style={{
                        border: weeksCount === p.weeks ? '1px solid #1677ff' : '1px solid #d9d9d9',
                        borderRadius: 20,
                        padding: '1px 10px',
                        fontSize: 11,
                        background: weeksCount === p.weeks ? '#e6f4ff' : '#ffffff',
                        color: weeksCount === p.weeks ? '#1677ff' : '#595959',
                        fontWeight: weeksCount === p.weeks ? 600 : 400
                      }}
                    >
                      {p.label}
                    </Tag.CheckableTag>
                  ))}
                </Space>
              </Col>
            </>
          ) : (
            <Col xs={24} sm={14}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4, color: '#434343' }}>
                Khoảng ngày áp dụng:
              </Text>
              <DateRangePicker
                value={recurringDateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setRecurringDateRange([dates[0], dates[1]]);
                    const startDayVN = getVNday(dates[0]);
                    if (!recurringDaysOfWeek.includes(startDayVN)) {
                      setRecurringDaysOfWeek([startDayVN]);
                    }
                  }
                }}
                minDate={dayjs()}
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
              />
            </Col>
          )}
        </Row>
      </div>

      {/* Block 2: Chọn các Thứ trong tuần */}
      <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e6f4ff', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
          <Text strong style={{ fontSize: 12, color: '#434343' }}>
            📅 Lặp vào các Thứ trong tuần:
          </Text>
          <Space size={4}>
            <Button
              size="small"
              type="dashed"
              onClick={() => setRecurringDaysOfWeek([2, 4, 6])}
              style={{ fontSize: 11, borderRadius: 4, height: 22, padding: '0 8px' }}
            >
              2-4-6
            </Button>
            <Button
              size="small"
              type="dashed"
              onClick={() => setRecurringDaysOfWeek([3, 5, 7])}
              style={{ fontSize: 11, borderRadius: 4, height: 22, padding: '0 8px' }}
            >
              3-5-7
            </Button>
            <Button
              size="small"
              type="dashed"
              onClick={() => setRecurringDaysOfWeek([2, 3, 4, 5, 6])}
              style={{ fontSize: 11, borderRadius: 4, height: 22, padding: '0 8px' }}
            >
              T2 ➔ T6
            </Button>
          </Space>
        </div>

        <Space wrap size={[6, 6]}>
          {DAY_OF_WEEK_OPTIONS.map(d => {
            const isSelected = recurringDaysOfWeek.includes(d.value);
            return (
              <Tag.CheckableTag
                key={d.value}
                checked={isSelected}
                onChange={(checked) => {
                  if (checked) {
                    setRecurringDaysOfWeek([...recurringDaysOfWeek, d.value]);
                  } else {
                    if (recurringDaysOfWeek.length > 1) {
                      setRecurringDaysOfWeek(recurringDaysOfWeek.filter(v => v !== d.value));
                    } else {
                      message.warning('Phải giữ ít nhất 1 Thứ trong tuần');
                    }
                  }
                }}
                style={{
                  padding: '4px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: isSelected ? '1px solid #1677ff' : '1px solid #e8e8e8',
                  backgroundColor: isSelected ? '#1677ff' : '#fafafa',
                  color: isSelected ? '#ffffff' : '#595959',
                  boxShadow: isSelected ? '0 2px 6px rgba(22, 119, 255, 0.25)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {isSelected && <CheckOutlined style={{ marginRight: 4, fontSize: 11 }} />}
                {d.label}
              </Tag.CheckableTag>
            );
          })}
        </Space>
      </div>

      {/* Block 3: Live Generated Sessions Summary & Preview */}
      <div style={{ background: '#ffffff', borderRadius: 8, padding: 12, border: '1px solid #e6f4ff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
          <Space align="center" size={8}>
            <Text strong style={{ fontSize: 12, color: '#262626' }}>
              📊 Thống kê buổi học ({calculatedRecurringSessions.length} buổi):
            </Text>
            <Tag color="success" style={{ margin: 0, fontWeight: 600, borderRadius: 12 }}>
              ✓ {validSessions.length} Sẵn sàng
            </Tag>
            {conflictSessions.length > 0 && (
              <Tag color="error" style={{ margin: 0, fontWeight: 600, borderRadius: 12 }}>
                ✕ {conflictSessions.length} Trùng lịch
              </Tag>
            )}
          </Space>

          <Space align="center" size={6}>
            <Text style={{ fontSize: 11, color: '#8c8c8c' }}>Tự động bỏ qua buổi trùng:</Text>
            <Switch
              size="small"
              checked={skipConflicts}
              onChange={setSkipConflicts}
            />
          </Space>
        </div>

        {conflictSessions.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 8, padding: '4px 10px', fontSize: 11, borderRadius: 6 }}
            message={
              <span>
                Có <b>{conflictSessions.length}</b> buổi trùng với lịch khác.
                {skipConflicts ? ' Hệ thống sẽ tự lọc bỏ khi bạn bấm Gửi đơn.' : ' Bạn đang chọn gửi tất cả.'}
              </span>
            }
          />
        )}

        {/* Scrollable Chips List */}
        <div style={{ maxHeight: 110, overflowY: 'auto', paddingRight: 4 }}>
          <Space wrap size={[4, 6]}>
            {calculatedRecurringSessions.map(session => (
              <Tooltip
                key={session.key}
                title={
                  session.isBooked
                    ? `🔴 Bận: ${session.bookingInfo?.purpose || 'Lịch phòng khác'} (${session.bookingInfo?.user?.fullName || session.bookingInfo?.userName || 'Giảng viên khác'})`
                    : `🟢 Còn trống: ${selectedRoomObj?.roomName || 'Phòng máy'} sẵn sàng`
                }
              >
                <Tag
                  color={session.isBooked ? 'error' : 'success'}
                  icon={session.isBooked ? <CloseCircleFilled /> : <CheckCircleFilled />}
                  style={{
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 11,
                    marginRight: 0,
                    textDecoration: (session.isBooked && skipConflicts) ? 'line-through' : 'none',
                    opacity: (session.isBooked && skipConflicts) ? 0.55 : 1
                  }}
                >
                  {session.dayOfWeekText} {session.displayDate}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        </div>
      </div>
    </div>
  );

  // Thống kê số lượng đơn mượn của tôi theo trạng thái
  const myPendingCount = data.filter(b => b.status === 'PENDING').length;
  const myApprovedCount = data.filter(b => b.status === 'APPROVED').length;
  const myReturnedCount = data.filter(b => b.status === 'RETURNED').length;
  const myRejectedCount = data.filter(b => b.status === 'REJECTED' || b.status === 'CANCELLED').length;

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
              Hệ thống đăng ký phòng thực hành máy tính linh hoạt & đặt lịch xoay tuần hoàn dành cho Giảng viên VinhUni
            </Text>
          </Col>
          <Col>
            <Space wrap>
              <Button
                size="large"
                icon={<FileExcelOutlined />}
                onClick={() => setIsImportModalOpen(true)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontWeight: 600,
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                Import TKB Excel
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => {
                  form.resetFields();
                  if (rooms.length > 0) handleSelectRoom(rooms[0].id);
                  setBookingType('SINGLE');
                  setIsModalOpen(true);
                }}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1677ff',
                  fontWeight: 600,
                  border: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              >
                Tạo yêu cầu mượn phòng
              </Button>
            </Space>
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
                  <Badge
                    count={data.length}
                    overflowCount={999}
                    style={{ backgroundColor: '#1677ff', marginLeft: 8 }}
                  />
                </span>
              ),
              children: (
                <div>
                  <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                      <Space wrap align="center">
                        <Text strong style={{ fontSize: 14 }}>
                          📊 Tổng số đơn: <Tag color="blue" style={{ fontSize: 13, fontWeight: 600 }}>{data.length} bản ghi</Tag>
                        </Text>
                        {statusFilter && statusFilter !== 'ALL' && (
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            (Đang lọc: <b>{filteredMyBookings.length}</b> bản ghi)
                          </Text>
                        )}
                        <Divider type="vertical" />
                        <Space size={6} wrap>
                          <Tag color="gold">Chờ duyệt: <b>{myPendingCount}</b></Tag>
                          <Tag color="green">Đã duyệt: <b>{myApprovedCount}</b></Tag>
                          <Tag color="cyan">Đã trả: <b>{myReturnedCount}</b></Tag>
                          {myRejectedCount > 0 && <Tag color="red">Từ chối/Hủy: <b>{myRejectedCount}</b></Tag>}
                        </Space>
                      </Space>
                    </Col>
                    <Col>
                      <Space wrap>
                        <Button
                          icon={<FileExcelOutlined />}
                          onClick={() => setIsImportModalOpen(true)}
                          style={{ color: '#27ae60', borderColor: '#27ae60', fontWeight: 600 }}
                        >
                          Import TKB Excel
                        </Button>
                        <Select
                          placeholder="Lọc trạng thái"
                          allowClear
                          style={{ width: 170 }}
                          value={statusFilter}
                          onChange={(val) => {
                            setStatusFilter(val || undefined);
                            setMyBookingsPage(1);
                          }}
                          options={[
                            { value: 'ALL', label: 'Tất cả trạng thái' },
                            { value: 'PENDING', label: '🟡 Chờ duyệt' },
                            { value: 'APPROVED', label: '🟢 Đã duyệt' },
                            { value: 'RETURNED', label: '🔵 Đã trả phòng' },
                            { value: 'REJECTED', label: '🔴 Từ chối' },
                            { value: 'CANCELLED', label: '⚪ Đã hủy' },
                          ]}
                        />
                      </Space>
                    </Col>
                  </Row>

                  <Table
                    columns={columns}
                    dataSource={filteredMyBookings}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      current: myBookingsPage,
                      pageSize: myBookingsPageSize,
                      total: filteredMyBookings.length,
                      showSizeChanger: true,
                      pageSizeOptions: ['6', '12', '24', '50'],
                      showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} của ${total} bản ghi`,
                      onChange: (p, s) => {
                        setMyBookingsPage(p);
                        setMyBookingsPageSize(s);
                      }
                    }}
                  />
                </div>
              )
            },
            {
              key: 'weekly-schedule',
              label: (
                <span>
                  <CalendarOutlined /> Thời khóa biểu theo Tuần (Weekly Matrix)
                </span>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  {/* Controls Header: Select Room & Week Navigation */}
                  <Row gutter={[16, 16]} align="middle" justify="space-between" style={{ marginBottom: 16, background: '#fafafa', padding: '12px 16px', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                    <Col xs={24} md={8}>
                      <Space align="center" style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: 14 }}>Phòng máy:</Text>
                        <Select
                          style={{ minWidth: 200 }}
                          value={selectedRoomId}
                          onChange={handleSelectRoom}
                          options={rooms.map(r => ({ value: r.id, label: `${r.roomName} (${r.location || 'Khu Lab'})` }))}
                        />
                        {roomBookingsLoading && <Spin size="small" />}
                      </Space>
                    </Col>
                    <Col xs={24} md={16} style={{ textAlign: 'right' }}>
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
                    </Col>
                  </Row>

                  {/* Week Banner Info */}
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 15, color: '#1677ff' }}>
                      <CalendarOutlined style={{ marginRight: 6 }} />
                      Lịch mượn phòng {rooms.find(r => r.id === selectedRoomId)?.roomName}: Từ ngày {getMonday(selectedWeekStart).format('DD/MM/YYYY')} đến ngày {getMonday(selectedWeekStart).add(6, 'day').format('DD/MM/YYYY')}
                    </Text>
                    <Space size={16} style={{ fontSize: 12 }}>
                      <span><Badge status="success" /> <Text type="success">Đã duyệt (Chắc chắn bận)</Text></span>
                      <span><Badge status="warning" /> <Text type="warning">Chờ duyệt</Text></span>
                      <span><Badge status="default" /> <Text type="secondary">Bấm vào ô trống để đăng ký</Text></span>
                    </Space>
                  </div>

                  {/* Weekly Matrix Table */}
                  <Table
                    bordered
                    pagination={false}
                    rowKey="id"
                    loading={roomBookingsLoading}
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
                              const statusMeta = statusMap[bookingInfo.status as BookingStatus] || statusMap.PENDING;
                              return (
                                <Tooltip
                                  title={
                                    <div>
                                      <b>{bookingInfo.purpose || 'Thực hành môn học'}</b><br />
                                      👤 Người mượn: {bookingInfo.user?.fullName || bookingInfo.userName || 'Giảng viên'}<br />
                                      ⏰ Giờ: {slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)}<br />
                                      📌 Trạng thái: {statusMeta.text}
                                    </div>
                                  }
                                >
                                  <div
                                    style={{
                                      padding: '6px 8px',
                                      borderRadius: 6,
                                      background: bookingInfo.status === 'APPROVED' ? '#f6ffed' : '#fffbe6',
                                      border: `1px solid ${bookingInfo.status === 'APPROVED' ? '#b7eb8f' : '#ffe58f'}`,
                                      fontSize: 12,
                                      textAlign: 'center'
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
                                </Tooltip>
                              );
                            }

                            return (
                              <div
                                onClick={() => {
                                  form.resetFields();
                                  handleSelectRoom(selectedRoomId || (rooms[0] ? rooms[0].id : 1));
                                  form.setFieldsValue({
                                    roomId: selectedRoomId || (rooms[0] ? rooms[0].id : 1),
                                    bookingDate: dayObj,
                                    timeSlotId: slot.id
                                  });
                                  handleSelectSlot(slot);
                                  setBookingType('SINGLE');
                                  setIsModalOpen(true);
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
                                Đặt phòng
                              </div>
                            );
                          }
                        };
                      })
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'quick-booking',
              label: (
                <span>
                  <ThunderboltFilled style={{ color: '#fa8c16' }} /> Đặt phòng trực quan (Visual & Recurring Grid)
                </span>
              ),
              children: (
                <div style={{ paddingTop: 4 }}>
                  {/* Top Workflow Visual Bar */}
                  <div style={{
                    background: 'linear-gradient(135deg, #0958d9 0%, #1677ff 60%, #36cfc9 100%)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 20,
                    color: '#ffffff',
                    boxShadow: '0 4px 16px rgba(22, 119, 255, 0.18)'
                  }}>
                    <Row align="middle" justify="space-between" gutter={[16, 12]}>
                      <Col xs={24} md={14}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18
                          }}>
                            ⚡
                          </div>
                          <div>
                            <Text strong style={{ color: '#ffffff', fontSize: 16, display: 'block' }}>
                              Lập lịch & Đặt phòng Thực hành Trực quan
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                              Kiểm tra tình trạng phòng theo thời gian thực, chọn tiết học và lên lịch xoay tuần hoàn nhanh chóng
                            </Text>
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} md={10} style={{ textAlign: 'right' }}>
                        <Space wrap size={6}>
                          <Tag style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
                            🏢 <b>{rooms.length}</b> Phòng máy
                          </Tag>
                          <Tag style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
                            ⏰ <b>{timeSlots.length}</b> Ca học
                          </Tag>
                          <Tag style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
                            🛡️ Check trùng tự động
                          </Tag>
                        </Space>
                      </Col>
                    </Row>
                  </div>

                  <Row gutter={[20, 20]}>
                    {/* Left Column: Room Grid & Slot Matrix */}
                    <Col xs={24} lg={14}>
                      {/* Step 1: Room Selection Cards */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Space align="center" size={8}>
                            <div style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: '#1677ff',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700
                            }}>
                              1
                            </div>
                            <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>
                              Chọn phòng máy muốn mượn:
                            </Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Đang chọn: <b style={{ color: '#1677ff' }}>{selectedRoomObj?.roomName || 'Chưa chọn'}</b>
                          </Text>
                        </div>

                        <Row gutter={[10, 10]}>
                          {rooms.map(room => {
                            const isSelected = (form.getFieldValue('roomId') || selectedRoomId) === room.id;
                            return (
                              <Col xs={12} sm={8} key={room.id}>
                                <div
                                  onClick={() => handleSelectRoom(room.id)}
                                  style={{
                                    borderRadius: 12,
                                    border: isSelected ? '2px solid #1677ff' : '1px solid #e8e8e8',
                                    backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                                    padding: '12px 14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: isSelected ? '0 6px 16px rgba(22, 119, 255, 0.18)' : '0 2px 6px rgba(0,0,0,0.03)',
                                    transform: isSelected ? 'translateY(-2px)' : 'none',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {isSelected && (
                                    <div style={{
                                      position: 'absolute',
                                      top: 0,
                                      right: 0,
                                      width: 28,
                                      height: 28,
                                      background: '#1677ff',
                                      borderBottomLeftRadius: 14,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#ffffff',
                                      fontSize: 12
                                    }}>
                                      <CheckOutlined />
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <DesktopOutlined style={{ color: isSelected ? '#1677ff' : '#595959', fontSize: 15 }} />
                                    <Text strong style={{ color: isSelected ? '#0958d9' : '#262626', fontSize: 14 }}>
                                      {room.roomName}
                                    </Text>
                                  </div>

                                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                                    {room.location || 'Khu Lab thực hành'}
                                  </Text>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                    <Tag color={isSelected ? 'blue' : 'default'} style={{ margin: 0, fontSize: 11, borderRadius: 10, padding: '0 8px' }}>
                                      💻 {room.totalSeats || 30} máy
                                    </Tag>
                                    {room.technician && (
                                      <Tooltip title={`KTV phụ trách: ${room.technician.fullName || room.technician.username}`}>
                                        <Tag color="cyan" style={{ margin: 0, fontSize: 10, borderRadius: 10, padding: '0 6px' }}>
                                          🔧 {room.technician.fullName?.split(' ').pop() || 'KTV'}
                                        </Tag>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              </Col>
                            );
                          })}
                        </Row>
                      </div>

                      {/* Step 2: Time Slots Matrix */}
                      <div style={{ background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                          <Space align="center" size={8}>
                            <div style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: '#1677ff',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700
                            }}>
                              2
                            </div>
                            <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>
                              Chọn tiết học & Khung giờ còn trống:
                            </Text>
                          </Space>

                          <Space align="center" size={6}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Ngày kiểm tra:</Text>
                            <DatePicker
                              value={selectedCheckDate}
                              onChange={(date) => {
                                if (date) {
                                  setSelectedCheckDate(date);
                                  form.setFieldsValue({ bookingDate: date });
                                }
                              }}
                              format="YYYY-MM-DD"
                              minDate={dayjs()}
                              allowClear={false}
                              style={{ width: 130 }}
                              size="small"
                            />
                            <Button
                              size="small"
                              onClick={() => {
                                const today = dayjs();
                                setSelectedCheckDate(today);
                                form.setFieldsValue({ bookingDate: today });
                              }}
                              style={{ fontSize: 11 }}
                            >
                              Hôm nay
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                const tomorrow = dayjs().add(1, 'day');
                                setSelectedCheckDate(tomorrow);
                                form.setFieldsValue({ bookingDate: tomorrow });
                              }}
                              style={{ fontSize: 11 }}
                            >
                              Ngày mai
                            </Button>
                            {roomBookingsLoading && <Spin size="small" />}
                          </Space>
                        </div>

                        {/* Status guide mini bar */}
                        <div style={{
                          marginBottom: 14,
                          padding: '6px 12px',
                          background: '#fbfbfb',
                          borderRadius: 8,
                          border: '1px solid #f0f0f0',
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16
                        }}>
                          <span><Badge status="success" /> <Text type="success" strong>Xanh lá:</Text> Khung giờ còn trống</span>
                          <span><Badge status="error" /> <Text type="danger" strong>Đỏ:</Text> Đã có lịch đặt</span>
                          <span><Badge status="processing" /> <Text style={{ color: '#1677ff' }} strong>Xanh dương:</Text> Đang chọn</span>
                        </div>

                        {/* Ca Sáng Section */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{ fontSize: 14 }}>☀️</span>
                            <Text strong style={{ fontSize: 13, color: '#d46b08' }}>
                              Ca Sáng (07:00 - 11:30)
                            </Text>
                          </div>
                          <Row gutter={[8, 8]}>
                            {morningSlots.map(slot => {
                              const isSelected = (form.getFieldValue('timeSlotId') || selectedSlotId) === slot.id;
                              const currentCheckDate = form.getFieldValue('bookingDate') || selectedCheckDate;
                              const { isBooked, bookingInfo } = checkSlotStatus(slot, currentCheckDate);

                              if (isBooked) {
                                return (
                                  <Col xs={12} sm={8} md={6} key={slot.id}>
                                    <Tooltip
                                      title={
                                        <div>
                                          <b>🔴 Đã có lịch đặt</b><br />
                                          📌 Môn: {bookingInfo?.purpose || 'Thực hành'}<br />
                                          👤 Giảng viên: {bookingInfo?.user?.fullName || bookingInfo?.userName || 'Giảng viên khác'}<br />
                                          ⏰ Giờ: {slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)}
                                        </div>
                                      }
                                    >
                                      <div style={{
                                        background: '#fff1f0',
                                        border: '1px solid #ffa39e',
                                        borderRadius: 8,
                                        padding: '8px 10px',
                                        textAlign: 'center',
                                        cursor: 'not-allowed',
                                        opacity: 0.85
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#cf1322', fontWeight: 600, fontSize: 12 }}>
                                          <CloseCircleFilled /> {slot.slotName}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                                          {slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)}
                                        </div>
                                        <Tag color="red" style={{ margin: '4px 0 0 0', fontSize: 10, borderRadius: 10, padding: '0 6px' }}>
                                          Đã bận
                                        </Tag>
                                      </div>
                                    </Tooltip>
                                  </Col>
                                );
                              }

                              return (
                                <Col xs={12} sm={8} md={6} key={slot.id}>
                                  <div
                                    onClick={() => handleSelectSlot(slot)}
                                    style={{
                                      background: isSelected ? 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)' : '#f6ffed',
                                      border: isSelected ? '1px solid #0958d9' : '1px solid #b7eb8f',
                                      borderRadius: 8,
                                      padding: '8px 10px',
                                      textAlign: 'center',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      boxShadow: isSelected ? '0 4px 12px rgba(22, 119, 255, 0.25)' : 'none',
                                      transform: isSelected ? 'translateY(-1px)' : 'none'
                                    }}
                                  >
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 4,
                                      color: isSelected ? '#ffffff' : '#389e0d',
                                      fontWeight: 600,
                                      fontSize: 12
                                    }}>
                                      {isSelected ? <CheckOutlined /> : <CheckCircleFilled />} {slot.slotName}
                                    </div>
                                    <div style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.85)' : '#595959', marginTop: 2 }}>
                                      {slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)}
                                    </div>
                                    <Tag color={isSelected ? 'blue' : 'green'} style={{ margin: '4px 0 0 0', fontSize: 10, borderRadius: 10, padding: '0 6px' }}>
                                      {isSelected ? 'Đang chọn' : 'Còn trống'}
                                    </Tag>
                                  </div>
                                </Col>
                              );
                            })}
                          </Row>
                        </div>

                        {/* Ca Chiều / Tối Section */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{ fontSize: 14 }}>🌙</span>
                            <Text strong style={{ fontSize: 13, color: '#1677ff' }}>
                              Ca Chiều & Tối (12:30 - 21:00)
                            </Text>
                          </div>
                          <Row gutter={[8, 8]}>
                            {afternoonSlots.map(slot => {
                              const isSelected = (form.getFieldValue('timeSlotId') || selectedSlotId) === slot.id;
                              const currentCheckDate = form.getFieldValue('bookingDate') || selectedCheckDate;
                              const { isBooked, bookingInfo } = checkSlotStatus(slot, currentCheckDate);

                              if (isBooked) {
                                return (
                                  <Col xs={12} sm={8} md={6} key={slot.id}>
                                    <Tooltip
                                      title={
                                        <div>
                                          <b>🔴 Đã có lịch đặt</b><br />
                                          📌 Môn: {bookingInfo?.purpose || 'Thực hành'}<br />
                                          👤 Giảng viên: {bookingInfo?.user?.fullName || bookingInfo?.userName || 'Giảng viên khác'}<br />
                                          ⏰ Giờ: {slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)}
                                        </div>
                                      }
                                    >
                                      <div style={{
                                        background: '#fff1f0',
                                        border: '1px solid #ffa39e',
                                        borderRadius: 8,
                                        padding: '8px 10px',
                                        textAlign: 'center',
                                        cursor: 'not-allowed',
                                        opacity: 0.85
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#cf1322', fontWeight: 600, fontSize: 12 }}>
                                          <CloseCircleFilled /> {slot.slotName}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                                          {slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)}
                                        </div>
                                        <Tag color="red" style={{ margin: '4px 0 0 0', fontSize: 10, borderRadius: 10, padding: '0 6px' }}>
                                          Đã bận
                                        </Tag>
                                      </div>
                                    </Tooltip>
                                  </Col>
                                );
                              }

                              return (
                                <Col xs={12} sm={8} md={6} key={slot.id}>
                                  <div
                                    onClick={() => handleSelectSlot(slot)}
                                    style={{
                                      background: isSelected ? 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)' : '#f6ffed',
                                      border: isSelected ? '1px solid #0958d9' : '1px solid #b7eb8f',
                                      borderRadius: 8,
                                      padding: '8px 10px',
                                      textAlign: 'center',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      boxShadow: isSelected ? '0 4px 12px rgba(22, 119, 255, 0.25)' : 'none',
                                      transform: isSelected ? 'translateY(-1px)' : 'none'
                                    }}
                                  >
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 4,
                                      color: isSelected ? '#ffffff' : '#389e0d',
                                      fontWeight: 600,
                                      fontSize: 12
                                    }}>
                                      {isSelected ? <CheckOutlined /> : <CheckCircleFilled />} {slot.slotName}
                                    </div>
                                    <div style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.85)' : '#595959', marginTop: 2 }}>
                                      {slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)}
                                    </div>
                                    <Tag color={isSelected ? 'blue' : 'green'} style={{ margin: '4px 0 0 0', fontSize: 10, borderRadius: 10, padding: '0 6px' }}>
                                      {isSelected ? 'Đang chọn' : 'Còn trống'}
                                    </Tag>
                                  </div>
                                </Col>
                              );
                            })}
                          </Row>
                        </div>
                      </div>
                    </Col>

                    {/* Right Column: Live Booking Form Preview */}
                    <Col xs={24} lg={10}>
                      <Card
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space size={8}>
                              <div style={{
                                width: 26,
                                height: 26,
                                borderRadius: 6,
                                background: '#e6f4ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#1677ff'
                              }}>
                                <SendOutlined />
                              </div>
                              <span style={{ fontSize: 15, fontWeight: 700, color: '#1f1f1f' }}>
                                Thông tin đăng ký mượn phòng
                              </span>
                            </Space>
                          </div>
                        }
                        style={{
                          borderRadius: 14,
                          background: '#ffffff',
                          border: '1px solid #e6f4ff',
                          boxShadow: '0 4px 18px rgba(0,0,0,0.06)'
                        }}
                        bodyStyle={{ padding: '16px 20px' }}
                      >
                        {/* Booking Mode Selector */}
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6, color: '#595959' }}>
                            CHẾ ĐỘ ĐẶT LỊCH:
                          </Text>
                          <Segmented
                            block
                            size="large"
                            value={bookingType}
                            onChange={(val: any) => setBookingType(val)}
                            options={[
                              { label: <span style={{ fontWeight: 600 }}><DesktopOutlined /> Đặt 1 buổi lẻ</span>, value: 'SINGLE' },
                              { label: <span style={{ fontWeight: 600 }}><SyncOutlined /> Đặt xoay tuần hoàn (TKB)</span>, value: 'RECURRING' }
                            ]}
                          />
                        </div>

                        <Form form={form} layout="vertical" onFinish={handleCreate}>
                          <Form.Item name="roomId" label="Phòng máy mượn" rules={[{ required: true, message: 'Chọn phòng máy!' }]}>
                            <Select placeholder="Chọn phòng máy" onChange={handleSelectRoom} size="middle">
                              {rooms.map(r => (
                                <Select.Option key={r.id} value={r.id}>
                                  {r.roomName} ({r.location || 'Khu Lab'}) - {r.totalSeats || 30} máy
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>

                          {/* Render Recurring Options if selected */}
                          {bookingType === 'RECURRING' ? (
                            renderRecurringConfig()
                          ) : (
                            <Form.Item name="bookingDate" label="Ngày mượn" rules={[{ required: true, message: 'Chọn ngày!' }]}>
                              <DatePicker
                                style={{ width: '100%' }}
                                minDate={dayjs()}
                                format="YYYY-MM-DD"
                                onChange={(val) => {
                                  if (val) setSelectedCheckDate(val);
                                }}
                              />
                            </Form.Item>
                          )}

                          {/* Chọn nhanh ca học theo chuẩn trường */}
                          <div style={{ marginBottom: 12 }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                              ⚡ Chọn nhanh ca học chuẩn VinhUni:
                            </Text>
                            <Space wrap size={[4, 6]}>
                              {STANDARD_PERIOD_PRESETS.map(p => (
                                <Tag.CheckableTag
                                  key={p.id}
                                  checked={selectedPresetId === p.id}
                                  onChange={() => handleApplyPreset(p)}
                                  style={{
                                    border: selectedPresetId === p.id ? '1px solid #1677ff' : '1px solid #e8e8e8',
                                    borderRadius: 12,
                                    fontSize: 11,
                                    padding: '1px 8px',
                                    background: selectedPresetId === p.id ? '#e6f4ff' : '#fafafa',
                                    color: selectedPresetId === p.id ? '#1677ff' : '#595959',
                                    fontWeight: selectedPresetId === p.id ? 600 : 400
                                  }}
                                >
                                  {p.label}
                                </Tag.CheckableTag>
                              ))}
                            </Space>
                          </div>

                          <Form.Item name="timeSlotId" label="Tiết học (Khung giờ mẫu)">
                            <Select
                              placeholder="Chọn tiết học"
                              allowClear
                              onChange={(id) => {
                                const s = timeSlots.find(x => x.id === id);
                                if (s) handleSelectSlot(s);
                              }}
                            >
                              {timeSlots.map(ts => {
                                const targetDate = form.getFieldValue('bookingDate') || selectedCheckDate;
                                const { isBooked } = checkSlotStatus(ts, targetDate);
                                return (
                                  <Select.Option key={ts.id} value={ts.id} disabled={bookingType === 'SINGLE' && isBooked}>
                                    {ts.slotName} ({ts.startTime?.substring(0, 5)} - {ts.endTime?.substring(0, 5)}) {bookingType === 'SINGLE' ? (isBooked ? '🔴 [Đã có lịch]' : '🟢 [Còn trống]') : ''}
                                  </Select.Option>
                                );
                              })}
                            </Select>
                          </Form.Item>

                          <Form.Item name="timeRange" label="Khung giờ mượn chính xác" rules={[{ required: true, message: 'Chọn khung giờ!' }]}>
                            <TimeRangePicker format="HH:mm" style={{ width: '100%' }} />
                          </Form.Item>

                          <Form.Item name="purpose" label="Mục đích mượn / Tên môn học & Lớp" rules={[{ required: true, message: 'Nhập mục đích!' }]}>
                            <Input.TextArea placeholder="Ví dụ: Lập trình Hướng đối tượng - K65 CNTT 1" rows={2} />
                          </Form.Item>

                          <Button
                            type="primary"
                            block
                            size="large"
                            htmlType="submit"
                            icon={bookingType === 'RECURRING' ? <SyncOutlined /> : <SendOutlined />}
                            loading={loading}
                            style={{
                              background: bookingType === 'RECURRING'
                                ? 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)'
                                : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                              height: 46,
                              borderRadius: 10,
                              fontWeight: 700,
                              fontSize: 14,
                              boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)',
                              border: 'none'
                            }}
                          >
                            {bookingType === 'RECURRING'
                              ? `Gửi yêu cầu đặt ${skipConflicts ? validSessions.length : calculatedRecurringSessions.length} buổi xoay tuần hoàn`
                              : 'Gửi yêu cầu mượn phòng máy'}
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

      {/* Modal đăng ký mượn nâng cao (Hỗ trợ cả Đơn lẻ & Xoay tuần hoàn) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DesktopOutlined style={{ color: '#1677ff', fontSize: 18, marginRight: 8 }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {bookingType === 'RECURRING' ? 'Đăng ký đặt phòng xoay tuần hoàn (TKB Học kỳ)' : 'Đăng ký mượn phòng máy thực hành'}
            </span>
          </div>
        }
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        okText={
          bookingType === 'RECURRING'
            ? `Gửi yêu cầu (${skipConflicts ? validSessions.length : calculatedRecurringSessions.length} buổi)`
            : 'Gửi yêu cầu mượn'
        }
        cancelText="Hủy"
        width={bookingType === 'RECURRING' ? 820 : 650}
        confirmLoading={loading}
      >
        {/* Booking Mode Selector inside Modal */}
        <div style={{ marginBottom: 16, marginTop: 8 }}>
          <Segmented
            block
            size="large"
            value={bookingType}
            onChange={(val: any) => setBookingType(val)}
            options={[
              { label: <span><DesktopOutlined /> Đặt 1 buổi lẻ</span>, value: 'SINGLE' },
              { label: <span><SyncOutlined /> Đặt xoay tuần hoàn (TKB Học kỳ)</span>, value: 'RECURRING' }
            ]}
          />
        </div>

        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={bookingType === 'RECURRING' ? 24 : 12}>
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

            {bookingType === 'SINGLE' && (
              <Col span={12}>
                <Form.Item name="bookingDate" label="Ngày mượn" rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}>
                  <DatePicker
                    style={{ width: '100%' }}
                    minDate={dayjs()}
                    format="YYYY-MM-DD"
                    onChange={(val) => {
                      if (val) setSelectedCheckDate(val);
                    }}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* Render Recurring Options if RECURRING */}
          {bookingType === 'RECURRING' && renderRecurringConfig()}

          {/* Ca học mẫu nhanh */}
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              ⚡ Chọn nhanh ca học theo chuẩn Đại học Vinh:
            </Text>
            <Space wrap size={[4, 6]}>
              {STANDARD_PERIOD_PRESETS.map(p => (
                <Tag.CheckableTag
                  key={p.id}
                  checked={selectedPresetId === p.id}
                  onChange={() => handleApplyPreset(p)}
                  style={{
                    border: selectedPresetId === p.id ? '1px solid #1677ff' : '1px solid #d9d9d9',
                    borderRadius: 4,
                    fontSize: 12
                  }}
                >
                  {p.label}
                </Tag.CheckableTag>
              ))}
            </Space>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="timeSlotId" label="Chọn tiết học mẫu">
                <Select
                  placeholder="Chọn tiết học..."
                  allowClear
                  onChange={(id) => {
                    const s = timeSlots.find(x => x.id === id);
                    if (s) handleSelectSlot(s);
                  }}
                >
                  {timeSlots.map(ts => {
                    const targetDate = form.getFieldValue('bookingDate') || selectedCheckDate;
                    const { isBooked } = checkSlotStatus(ts, targetDate);
                    return (
                      <Select.Option key={ts.id} value={ts.id} disabled={bookingType === 'SINGLE' && isBooked}>
                        {ts.slotName} ({ts.startTime ? ts.startTime.substring(0, 5) : ''} - {ts.endTime ? ts.endTime.substring(0, 5) : ''}) {bookingType === 'SINGLE' ? (isBooked ? '🔴 [Đã có lịch]' : '🟢 [Còn trống]') : ''}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timeRange" label="Thời gian mượn (Giờ BĐ - Giờ KT)" rules={[{ required: true, message: 'Chọn thời gian!' }]}>
                <TimeRangePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="purpose" label="Mục đích sử dụng / Tên môn học & Lớp" rules={[{ required: true, message: 'Vui lòng nhập mục đích!' }]}>
            <Input.TextArea placeholder="Ví dụ: Thực hành Lập trình Web - K65 (Nhóm 01)" rows={2} />
          </Form.Item>

          {/* Live Summary Preview Box */}
          <div style={{ background: '#e6f4ff', padding: '12px 16px', borderRadius: 8, border: '1px solid #91caff' }}>
            <Text strong style={{ color: '#0958d9' }}>
              <InfoCircleOutlined style={{ marginRight: 6 }} />
              Tóm tắt thông tin đăng ký:
            </Text>
            <Row gutter={16} style={{ marginTop: 6, fontSize: 13 }}>
              <Col span={12}>
                📌 Phòng: <b>{selectedRoomObj?.roomName || 'Chưa chọn'}</b>
              </Col>
              <Col span={12}>
                🔄 Chế độ: <b>{bookingType === 'RECURRING' ? `Tuần hoàn (${calculatedRecurringSessions.length} buổi)` : '1 buổi lẻ'}</b>
              </Col>
              <Col span={12} style={{ marginTop: 4 }}>
                📅 Thời gian: <b>
                  {bookingType === 'RECURRING'
                    ? (recurringRangeType === 'WEEKS_COUNT'
                        ? `${weeksCount} tuần (Bắt đầu ${recurringStartDate?.format('DD/MM/YYYY')})`
                        : `${recurringDateRange?.[0]?.format('DD/MM/YYYY')} - ${recurringDateRange?.[1]?.format('DD/MM/YYYY')}`)
                    : (formBookingDate ? formBookingDate.format('DD/MM/YYYY') : 'Chưa chọn')}
                </b>
              </Col>
              <Col span={12} style={{ marginTop: 4 }}>
                ⏰ Tiết học: <b>{selectedSlotObj?.slotName || 'Tùy chỉnh'}</b>
              </Col>
              <Col span={12} style={{ marginTop: 4 }}>
                ⏱️ Khung giờ: <b>{formTimeRange ? `${formTimeRange[0]?.format('HH:mm')} - ${formTimeRange[1]?.format('HH:mm')}` : 'Chưa chọn'}</b>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>

      {/* Modal Import Lịch Mượn Phòng Hàng Loạt từ Excel */}
      <BookingImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchMyBookings();
          if (selectedRoomId) fetchRoomBookings(selectedRoomId);
        }}
        isTeacherMode={true}
      />
    </div>
  );
};

export default TeacherBooking;
