import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Card,
  Modal,
  Form,
  DatePicker,
  Select,
  Input,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tooltip,
  Typography,
  Badge
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  DesktopOutlined,
  UserOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  CheckSquareOutlined,
  ClearOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { bookingApi, type Booking, type BookingStatus } from '../../api/booking';
import { roomApi, type Room } from '../../api/room';
import { timeSlotApi, type TimeSlot } from '../../api/timeSlot';
import { BookingImportModal } from '../../components/admin/BookingImportModal';
import { exportBookingsToExcel } from '../../utils/excelParser';

const { Text } = Typography;

export const statusMap: Record<BookingStatus, { color: string; text: string; icon: React.ReactNode }> = {
  PENDING: { color: 'gold', text: 'Chờ duyệt', icon: <SyncOutlined spin /> },
  APPROVED: { color: 'green', text: 'Đã duyệt', icon: <CheckCircleOutlined /> },
  REJECTED: { color: 'red', text: 'Từ chối', icon: <CloseCircleOutlined /> },
  CANCELLED: { color: 'gray', text: 'Đã hủy', icon: <CloseCircleOutlined /> },
  RETURNED: { color: 'cyan', text: 'Đã trả phòng', icon: <CheckCircleOutlined /> },
};

const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Row selection & Bulk actions
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [form] = Form.useForm();

  // Filtering & Pagination
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookRes, roomRes, slotRes] = await Promise.all([
        bookingApi.search({ filter: 'id!=0', page: 0, size: 1000, sort: ['id,desc'] }),
        roomApi.getAll(),
        timeSlotApi.getAll().catch(() => ({ data: [] as TimeSlot[] }))
      ]);
      const list = bookRes.data?.content || (Array.isArray(bookRes.data) ? bookRes.data : []);
      setBookings(list);
      const roomList = Array.isArray(roomRes.data) ? roomRes.data : (roomRes.data as any)?.content || [];
      setRooms(roomList);
      const slotList = Array.isArray(slotRes.data) ? slotRes.data : (slotRes.data as any)?.content || [];
      setTimeSlots(slotList);
    } catch {
      message.error('Lỗi tải dữ liệu mượn phòng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      message.success('Tạo lịch mượn phòng thành công');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch {
      message.error('Phòng đã có lịch vào thời gian này!');
    }
  };

  const updateStatus = async (id: number, status: 'approve' | 'reject') => {
    try {
      if (status === 'approve') await bookingApi.approve(id);
      else await bookingApi.reject(id);
      message.success('Đã cập nhật trạng thái lịch mượn phòng');
      fetchData();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  // Duyệt hàng loạt các đơn mượn phòng đã chọn
  const handleBulkApprove = async () => {
    if (selectedRowKeys.length === 0) return;
    const keysToApprove = selectedRowKeys.map(k => Number(k));
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(keysToApprove.map(id => bookingApi.approve(id)));
      let successCount = 0;
      let failCount = 0;
      results.forEach(res => {
        if (res.status === 'fulfilled') successCount++;
        else failCount++;
      });

      if (failCount === 0) {
        message.success(`Đã duyệt thành công ${successCount} yêu cầu đặt phòng!`);
      } else {
        message.warning(`Đã duyệt ${successCount} yêu cầu (${failCount} yêu cầu thất bại hoặc đã được xử lý)`);
      }
      setSelectedRowKeys([]);
      fetchData();
    } catch {
      message.error('Lỗi khi duyệt hàng loạt');
    } finally {
      setBulkLoading(false);
    }
  };

  // Từ chối hàng loạt các đơn mượn phòng đã chọn
  const handleBulkReject = async () => {
    if (selectedRowKeys.length === 0) return;
    const keysToReject = selectedRowKeys.map(k => Number(k));
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(keysToReject.map(id => bookingApi.reject(id)));
      let successCount = 0;
      let failCount = 0;
      results.forEach(res => {
        if (res.status === 'fulfilled') successCount++;
        else failCount++;
      });

      if (failCount === 0) {
        message.success(`Đã từ chối ${successCount} yêu cầu đặt phòng!`);
      } else {
        message.warning(`Đã từ chối ${successCount} yêu cầu (${failCount} yêu cầu thất bại hoặc đã được xử lý)`);
      }
      setSelectedRowKeys([]);
      fetchData();
    } catch {
      message.error('Lỗi khi từ chối hàng loạt');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await bookingApi.delete(id);
      message.success('Đã xóa yêu cầu mượn phòng');
      fetchData();
    } catch {
      message.error('Xóa thất bại');
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await bookingApi.getAll();
      const allBookings = res.data || [];
      if (allBookings.length === 0) {
        message.warning('Không tìm thấy dữ liệu đặt phòng để xuất Excel');
        return;
      }
      exportBookingsToExcel(allBookings, rooms);
      message.success(`Đã xuất ${allBookings.length} lịch đặt phòng ra file Excel thành công!`);
    } catch {
      message.error('Lỗi khi xuất danh sách đặt phòng');
    } finally {
      setExporting(false);
    }
  };

  // Client Filtered Bookings
  const filteredBookings = bookings.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (selectedRoomId && (item.roomId !== selectedRoomId && item.room?.id !== selectedRoomId)) return false;
    if (searchText.trim()) {
      const kw = searchText.toLowerCase().trim();
      const userName = (item.userName || item.user?.fullName || '').toLowerCase();
      const roomName = (item.roomName || item.room?.roomName || '').toLowerCase();
      const purpose = (item.purpose || '').toLowerCase();
      return userName.includes(kw) || roomName.includes(kw) || purpose.includes(kw);
    }
    return true;
  });

  // Chọn nhanh tất cả đơn chờ duyệt trên bảng
  const handleSelectAllPending = () => {
    const pendingKeys = filteredBookings
      .filter(b => b.status === 'PENDING')
      .map(b => b.id);

    if (pendingKeys.length === 0) {
      message.info('Không có đơn mượn phòng nào đang chờ duyệt trong danh sách hiện tại');
      return;
    }
    setSelectedRowKeys(pendingKeys);
    message.success(`Đã chọn nhanh ${pendingKeys.length} đơn mượn phòng chờ duyệt!`);
  };

  // Calculate Metrics
  const pendingCount = bookings.filter(b => b.status === 'PENDING').length;
  const approvedCount = bookings.filter(b => b.status === 'APPROVED').length;
  const rejectedCount = bookings.filter(b => b.status === 'REJECTED' || b.status === 'CANCELLED').length;

  // Tính số lượng đơn PENDING trong các dòng được chọn
  const selectedBookingsList = bookings.filter(b => selectedRowKeys.includes(b.id));
  const pendingCountInSelection = selectedBookingsList.filter(b => b.status === 'PENDING').length;

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys);
    },
  };

  const columns: ColumnsType<Booking> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_value, _record, index) => (clientPage - 1) * clientPageSize + index + 1,
    },
    {
      title: 'Người mượn',
      key: 'user',
      sorter: (a, b) => {
        const nameA = a.user?.fullName || a.userName || '';
        const nameB = b.user?.fullName || b.userName || '';
        return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
      },
      render: (_, record) => {
        const name = record.user?.fullName || record.userName || 'Giảng viên';
        const email = record.user?.email;
        return (
          <Space>
            <UserOutlined style={{ color: '#1677ff' }} />
            <div>
              <Text strong>{name}</Text>
              {email && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{email}</Text></>}
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Phòng máy & KTV',
      key: 'room',
      sorter: (a, b) => {
        const roomA = a.room?.roomName || a.roomName || '';
        const roomB = b.room?.roomName || b.roomName || '';
        return roomA.localeCompare(roomB, 'vi', { sensitivity: 'base' });
      },
      render: (_, record) => {
        const roomData = record.room || rooms.find(r => r.id === (record.roomId || record.room?.id));
        const tech = record.room?.technician || roomData?.technician;
        const roomName = roomData?.roomName || record.roomName || 'N/A';
        return (
          <Space direction="vertical" size={2}>
            <Space>
              <DesktopOutlined style={{ color: '#52c41a' }} />
              <Text strong>{roomName}</Text>
            </Space>
            {roomData?.location && (
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>{roomData.location}</div>
            )}
            {tech ? (
              <Tooltip title={
                <div>
                  <b>Kỹ thuật viên phụ trách:</b><br />
                  👤 Họ tên: {tech.fullName || tech.username}<br />
                  {tech.email && <>✉️ Email: {tech.email}<br /></>}
                  {tech.phoneNumber && <>📞 SĐT: {tech.phoneNumber}</>}
                </div>
              }>
                <Tag color="cyan" style={{ fontSize: 11, margin: 0, cursor: 'pointer' }}>
                  🔧 KTV: {tech.fullName || tech.username}
                </Tag>
              </Tooltip>
            ) : (
              <Tag style={{ fontSize: 10, margin: 0, color: '#8c8c8c' }}>Chưa phân công KTV</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Ngày & Khung giờ',
      key: 'time',
      sorter: (a, b) => {
        const startA = a.startTime || a.bookingDate || '';
        const startB = b.startTime || b.bookingDate || '';
        return startA.localeCompare(startB);
      },
      defaultSortOrder: 'descend',
      render: (_, record) => {
        const dateStr = record.bookingDate || (record.startTime?.includes('T') ? record.startTime.split('T')[0] : record.startTime);
        const startStr = record.startTime?.includes('T') ? record.startTime.split('T')[1]?.substring(0, 5) : record.startTime?.substring(0, 5);
        const endStr = record.endTime?.includes('T') ? record.endTime.split('T')[1]?.substring(0, 5) : record.endTime?.substring(0, 5);

        return (
          <Space direction="vertical" size={2}>
            <Tag icon={<CalendarOutlined />} color="cyan">{dateStr || '---'}</Tag>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {startStr} - {endStr}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Mục đích mượn',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
      sorter: (a, b) => (a.purpose || '').localeCompare(b.purpose || '', 'vi', { sensitivity: 'base' }),
      render: (text: string) => <Tooltip title={text}>{text || 'Dạy thực hành'}</Tooltip>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
      render: (status: BookingStatus) => {
        const item = statusMap[status] || statusMap.PENDING;
        return <Tag color={item.color} icon={item.icon}>{item.text}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 210,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="Duyệt yêu cầu">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => updateStatus(record.id, 'approve')}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  Duyệt
                </Button>
              </Tooltip>
              <Tooltip title="Từ chối yêu cầu">
                <Button
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => updateStatus(record.id, 'reject')}
                >
                  Từ chối
                </Button>
              </Tooltip>
            </>
          )}
          <Popconfirm
            title="Xóa lịch mượn này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa lịch">
              <Button type="text" danger icon={<DeleteOutlined />} style={{ padding: '0 4px' }} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Top Banner Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng đơn mượn"
              value={bookings.length}
              prefix={<CalendarOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Chờ duyệt"
              value={pendingCount}
              valueStyle={{ color: '#faad14', fontWeight: 600 }}
              prefix={<Badge status="warning" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đã duyệt"
              value={approvedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Từ chối / Hủy"
              value={rejectedCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card
        title={
          <span>
            <CalendarOutlined style={{ color: '#1677ff', marginRight: 8 }} />
            Quản lý Đăng ký Mượn phòng máy
          </span>
        }
        extra={
          <Space wrap>
            <Button
              icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
              onClick={() => setIsImportModalOpen(true)}
              style={{ borderColor: '#52c41a', color: '#389e0d', fontWeight: 500 }}
            >
              Import Excel TKB
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportExcel} loading={exporting}>
              Xuất Excel
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
              style={{ fontWeight: 600 }}
            >
              Tạo mượn phòng
            </Button>
          </Space>
        }
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {/* Search & Filter Bar */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
          <Col xs={24} sm={8}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tìm theo người mượn, tên phòng, mục đích..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setClientPage(1);
              }}
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Lọc theo phòng máy"
              allowClear
              value={selectedRoomId}
              onChange={(val) => {
                setSelectedRoomId(val);
                setClientPage(1);
              }}
              options={rooms.map(r => ({ value: r.id, label: r.roomName }))}
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setClientPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'PENDING', label: '🟡 Chờ duyệt' },
                { value: 'APPROVED', label: '🟢 Đã duyệt' },
                { value: 'RETURNED', label: '🔵 Đã trả phòng' },
                { value: 'REJECTED', label: '🔴 Từ chối' },
              ]}
            />
          </Col>
          <Col xs={24} sm={6} style={{ textAlign: 'right' }}>
            <Button
              icon={<CheckSquareOutlined style={{ color: '#faad14' }} />}
              onClick={handleSelectAllPending}
              disabled={pendingCount === 0}
            >
              Chọn các đơn chờ duyệt ({pendingCount})
            </Button>
          </Col>
        </Row>

        {/* Thanh công cụ thao tác hàng loạt (Bulk Actions Bar) */}
        {selectedRowKeys.length > 0 && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              background: '#e6f7ff',
              border: '1px solid #91d5ff',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <Space align="center" wrap>
              <CheckCircleOutlined style={{ color: '#1677ff', fontSize: 18 }} />
              <Text strong style={{ fontSize: 14 }}>
                Đã chọn <span style={{ color: '#1677ff', fontSize: 16 }}>{selectedRowKeys.length}</span> đơn mượn phòng
              </Text>
              {pendingCountInSelection > 0 && (
                <Tag color="gold" style={{ fontWeight: 600 }}>
                  {pendingCountInSelection} đơn Chờ duyệt
                </Tag>
              )}
            </Space>

            <Space wrap>
              <Popconfirm
                title={`Duyệt hàng loạt ${selectedRowKeys.length} yêu cầu đã chọn?`}
                description="Hệ thống sẽ cập nhật trạng thái các đơn này sang 'Đã duyệt' (APPROVED)."
                onConfirm={handleBulkApprove}
                okText="Xác nhận duyệt"
                cancelText="Hủy"
                disabled={bulkLoading}
              >
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={bulkLoading}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 600 }}
                >
                  Duyệt hàng loạt ({selectedRowKeys.length})
                </Button>
              </Popconfirm>

              <Popconfirm
                title={`Từ chối hàng loạt ${selectedRowKeys.length} yêu cầu đã chọn?`}
                description="Hệ thống sẽ cập nhật trạng thái các đơn này sang 'Từ chối' (REJECTED)."
                onConfirm={handleBulkReject}
                okText="Xác nhận từ chối"
                cancelText="Hủy"
                disabled={bulkLoading}
              >
                <Button
                  danger
                  icon={<CloseOutlined />}
                  loading={bulkLoading}
                  style={{ fontWeight: 600 }}
                >
                  Từ chối hàng loạt ({selectedRowKeys.length})
                </Button>
              </Popconfirm>

              <Button
                icon={<ClearOutlined />}
                onClick={() => setSelectedRowKeys([])}
                disabled={bulkLoading}
              >
                Bỏ chọn
              </Button>
            </Space>
          </div>
        )}

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredBookings}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: clientPage,
            pageSize: clientPageSize,
            total: filteredBookings.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, s) => {
              setClientPage(p);
              setClientPageSize(s);
            },
          }}
        />

        {/* Modal Admin đăng ký mượn phòng */}
        <Modal
          title="Tạo đơn mượn phòng máy (Admin)"
          open={isModalOpen}
          onOk={() => form.submit()}
          onCancel={() => setIsModalOpen(false)}
          okText="Xác nhận tạo"
          cancelText="Hủy"
        >
          <Form form={form} layout="vertical" onFinish={handleCreateBooking}>
            <Form.Item name="roomId" label="Chọn phòng máy" rules={[{ required: true, message: 'Vui lòng chọn phòng!' }]}>
              <Select placeholder="Chọn phòng máy">
                {rooms.map(r => (
                  <Select.Option key={r.id} value={r.id}>
                    {r.roomName} ({r.location || 'Khu Lab'}) {r.technician ? `[KTV: ${r.technician.fullName || r.technician.username}]` : ''}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="timeSlotId" label="Chọn tiết học (Danh mục)">
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

            <Form.Item name="purpose" label="Mục đích sử dụng / Tên lớp" rules={[{ required: true, message: 'Vui lòng nhập mục đích!' }]}>
              <Input.TextArea placeholder="Ví dụ: Đặt lịch thực hành thi môn Lập trình Web" rows={3} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal Import Lịch Thực Hành từ Excel */}
        <BookingImportModal
          open={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={fetchData}
        />
      </Card>
    </div>
  );
};

export default BookingManagement;