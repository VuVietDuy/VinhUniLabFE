import React, { useState, useEffect } from 'react';
import {
  Modal,
  Upload,
  Button,
  Table,
  Tag,
  Space,
  Alert,
  Typography,
  message,
  Tooltip,
  Progress,
  Switch,
  Select,
  Row,
  Col,
  Input,
  Statistic,
  Card,
  Badge,
} from 'antd';
import {
  InboxOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DesktopOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  parseScheduleFromExcel,
  downloadSampleScheduleExcel,
  type ParsedScheduleRow,
} from '../../utils/excelParser';
import { bookingApi, type Booking } from '../../api/booking';
import { roomApi, type Room } from '../../api/room';
import { userApi, type User } from '../../api/user';
import { timeSlotApi, type TimeSlot } from '../../api/timeSlot';
import { getApiErrorMessage } from '../../utils/apiError';

const { Text } = Typography;

interface BookingImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookingImportModal: React.FC<BookingImportModalProps> = ({ open, onClose, onSuccess }) => {
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedScheduleRow[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [defaultUserId, setDefaultUserId] = useState<number | undefined>(undefined);

  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState<'normal' | 'active' | 'success' | 'exception'>('normal');
  const [fileName, setFileName] = useState<string>('');

  // Tùy chọn sinh lịch định kỳ hàng tuần
  const [autoRepeatWeekly, setAutoRepeatWeekly] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [filterValid, setFilterValid] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');

  // Tải danh mục phòng, người dùng, tiết học khi mở modal
  useEffect(() => {
    if (open) {
      const fetchPrerequisites = async () => {
        try {
          let loadedRooms: Room[] = [];
          try {
            const roomRes = await roomApi.getAll();
            if (Array.isArray(roomRes.data)) {
              loadedRooms = roomRes.data;
            } else if (roomRes.data && Array.isArray((roomRes.data as any).content)) {
              loadedRooms = (roomRes.data as any).content;
            }
          } catch {
            try {
              const searchRes = await roomApi.search({ page: 0, size: 1000 });
              loadedRooms = searchRes.data?.content || [];
            } catch {}
          }

          let loadedUsers: User[] = [];
          try {
            const userRes = await userApi.getAll();
            if (Array.isArray(userRes.data)) {
              loadedUsers = userRes.data;
            } else if (userRes.data && Array.isArray((userRes.data as any).content)) {
              loadedUsers = (userRes.data as any).content;
            }
          } catch {
            try {
              const userSearch = await userApi.search({ page: 0, size: 1000 });
              loadedUsers = userSearch.data?.content || [];
            } catch {}
          }

          let loadedSlots: TimeSlot[] = [];
          try {
            const slotRes = await timeSlotApi.getAll();
            if (Array.isArray(slotRes.data)) {
              loadedSlots = slotRes.data;
            }
          } catch {}

          setRooms(loadedRooms);
          setUsers(loadedUsers);
          setTimeSlots(loadedSlots);

          if (loadedUsers.length > 0 && !defaultUserId) {
            const adminOrFirst = loadedUsers.find((u) => u.role === 'ADMIN') || loadedUsers[0];
            setDefaultUserId(adminOrFirst.id);
          }
        } catch {
          message.error('Không thể tải danh mục phòng máy hoặc người dùng');
        }
      };

      fetchPrerequisites();
    }
  }, [open]);

  // Đọc lại file khi thay đổi cài đặt autoRepeatWeekly hoặc khi danh mục phòng/user vừa tải xong
  useEffect(() => {
    if (rawFile && open && rooms.length > 0) {
      reParseFile(rawFile, autoRepeatWeekly, rooms, users, timeSlots);
    }
  }, [rawFile, autoRepeatWeekly, rooms, users, timeSlots]);

  const handleReset = () => {
    setRawFile(null);
    setParsedData([]);
    setFileName('');
    setProgressPercent(0);
    setSearchText('');
    setFilterValid('ALL');
  };

  const handleClose = () => {
    if (submitting) return;
    handleReset();
    onClose();
  };

  const reParseFile = async (
    file: File,
    repeatWeekly: boolean,
    currentRooms = rooms,
    currentUsers = users,
    currentSlots = timeSlots
  ) => {
    setParsing(true);
    try {
      const results = await parseScheduleFromExcel(
        file,
        currentRooms,
        currentUsers,
        currentSlots,
        repeatWeekly
      );
      setParsedData(results);
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi đọc file Excel');
    } finally {
      setParsing(false);
    }
  };

  // Xử lý khi người dùng chọn file
  const handleFileChange = async (file: File) => {
    setParsing(true);
    setRawFile(file);
    setFileName(file.name);
    try {
      const results = await parseScheduleFromExcel(file, rooms, users, timeSlots, autoRepeatWeekly);
      setParsedData(results);
      if (results.length === 0) {
        message.warning('Không tìm thấy dữ liệu thời khóa biểu trong file Excel');
      } else {
        const validCount = results.filter((r) => r.isValid).length;
        const totalSessions = results
          .filter((r) => r.isValid)
          .reduce((sum, r) => sum + r.generatedDates.length, 0);
        message.success(
          `Đã đọc ${results.length} dòng TKB (${validCount} dòng hợp lệ, tương ứng ${totalSessions} buổi đặt phòng)`
        );
      }
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file!');
      handleReset();
    } finally {
      setParsing(false);
    }
  };

  // Cho phép người dùng trực tiếp chọn / gán lại phòng máy cho dòng bất kỳ
  const handleRowRoomChange = (rowKey: string, newRoomId: number) => {
    const chosenRoom = rooms.find((r) => r.id === newRoomId);
    if (!chosenRoom) return;

    setParsedData((prev) =>
      prev.map((row) => {
        if (row.key !== rowKey) return row;

        const remainingErrors = row.errorMessages.filter(
          (msg) => !msg.includes('chưa có trong hệ thống') && !msg.includes('Thiếu thông tin phòng')
        );

        return {
          ...row,
          matchedRoom: chosenRoom,
          errorMessages: remainingErrors,
          isValid: remainingErrors.length === 0,
        };
      })
    );
  };

  // Cho phép người dùng trực tiếp chọn / gán lại giảng viên cho dòng bất kỳ
  const handleRowUserChange = (rowKey: string, newUserId: number) => {
    const chosenUser = users.find((u) => u.id === newUserId);
    if (!chosenUser) return;

    setParsedData((prev) =>
      prev.map((row) => {
        if (row.key !== rowKey) return row;
        return {
          ...row,
          matchedUser: chosenUser,
        };
      })
    );
  };

  // Lọc dữ liệu hợp lệ
  const validRows = parsedData.filter((r) => r.isValid);
  const invalidRowsCount = parsedData.length - validRows.length;
  const totalSessionsToCreate = validRows.reduce((sum, r) => sum + r.generatedDates.length, 0);

  // Xử lý gửi dữ liệu lên Server
  const handleSubmit = async () => {
    if (validRows.length === 0) {
      message.error('Không có dòng thời khóa biểu nào hợp lệ để import');
      return;
    }

    setSubmitting(true);
    setProgressPercent(0);
    setProgressStatus('active');

    try {
      // 1. Chuẩn bị danh sách tất cả các booking sẽ được tạo
      const allBookingPayloads: Partial<Booking>[] = [];

      for (const row of validRows) {
        const roomId = row.matchedRoom!.id;
        const userId = row.matchedUser?.id || defaultUserId || 1;

        for (const dateStr of row.generatedDates) {
          allBookingPayloads.push({
            roomId,
            room: { id: roomId } as any,
            userId,
            user: { id: userId } as any,
            bookingDate: dateStr,
            startTime: `${dateStr}T${row.startTimeStr}`,
            endTime: `${dateStr}T${row.endTimeStr}`,
            purpose: row.purpose,
            status: 'APPROVED',
          });
        }
      }

      if (allBookingPayloads.length === 0) {
        message.error('Không có buổi học nào được sinh ra từ dữ liệu');
        setSubmitting(false);
        return;
      }

      // 2. Thử gọi saveAll trước
      let saveAllSuccess = false;
      try {
        await bookingApi.saveAll(allBookingPayloads);
        saveAllSuccess = true;
        setProgressPercent(100);
        setProgressStatus('success');
      } catch (err: any) {
        // Nếu API saveAll không tồn tại hoặc lỗi, fallback sang tạo batch song song
        saveAllSuccess = false;
      }

      // 3. Fallback: Nếu saveAll không thành công, gửi qua API create theo từng lô
      if (!saveAllSuccess) {
        let successCount = 0;
        let failCount = 0;
        const total = allBookingPayloads.length;
        const CHUNK_SIZE = 10;

        for (let i = 0; i < total; i += CHUNK_SIZE) {
          const chunk = allBookingPayloads.slice(i, i + CHUNK_SIZE);
          const results = await Promise.allSettled(chunk.map((item) => bookingApi.create(item)));

          results.forEach((res) => {
            if (res.status === 'fulfilled') successCount++;
            else failCount++;
          });

          const currentPercent = Math.min(99, Math.round(((i + chunk.length) / total) * 100));
          setProgressPercent(currentPercent);
        }

        setProgressPercent(100);
        if (failCount > 0) {
          message.warning(
            `Import hoàn tất: ${successCount}/${total} buổi học thành công (${failCount} buổi bị lỗi hoặc trùng lịch)`
          );
        } else {
          message.success(`Đã import thành công toàn bộ ${total} buổi học vào hệ thống!`);
        }
      } else {
        message.success(
          `Đã import thành công ${validRows.length} học phần (${allBookingPayloads.length} buổi học) vào hệ thống!`
        );
      }

      onSuccess();
      handleClose();
    } catch (error) {
      setProgressStatus('exception');
      message.error(getApiErrorMessage(error, 'Import lịch đặt phòng máy thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  // Dữ liệu bảng xem trước sau khi filter tìm kiếm
  const displayData = parsedData.filter((item) => {
    if (filterValid === 'VALID' && !item.isValid) return false;
    if (filterValid === 'INVALID' && item.isValid) return false;

    if (searchText.trim()) {
      const kw = searchText.toLowerCase().trim();
      const matchSub = item.subjectName.toLowerCase().includes(kw) || item.subjectCode.toLowerCase().includes(kw);
      const matchRoom = item.roomInput.toLowerCase().includes(kw) || (item.matchedRoom?.roomName || '').toLowerCase().includes(kw);
      const matchTeacher = item.teacherInput.toLowerCase().includes(kw);
      return matchSub || matchRoom || matchTeacher;
    }
    return true;
  });

  const columns: ColumnsType<ParsedScheduleRow> = [
    {
      title: 'STT',
      dataIndex: 'stt',
      key: 'stt',
      width: 55,
      align: 'center',
    },
    {
      title: 'Mã & Tên lớp học phần',
      key: 'subject',
      width: 260,
      render: (_, record) => (
        <div>
          <Space orientation="horizontal" size={4} wrap>
            {record.subjectCode && (
              <Tag color="geekblue" style={{ fontWeight: 600 }}>
                {record.subjectCode}
              </Tag>
            )}
            {record.cohort && <Tag color="default">{record.cohort}</Tag>}
            {record.credits && <Tag color="purple">{record.credits} TC</Tag>}
          </Space>
          <div style={{ fontWeight: 500, color: '#1677ff', marginTop: 3 }}>
            {record.subjectName}
          </div>
          {record.registeredStudents ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Sĩ số: {record.registeredStudents} SV
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Phòng học',
      key: 'room',
      width: 210,
      render: (_, record) => {
        return (
          <Space direction="vertical" size={3} style={{ width: '100%' }}>
            <Select
              style={{ width: '100%' }}
              size="small"
              placeholder={record.roomInput ? `Chọn phòng (${record.roomInput})` : 'Chọn phòng máy'}
              value={record.matchedRoom?.id}
              onChange={(newId) => handleRowRoomChange(record.key, newId)}
              status={!record.matchedRoom ? 'error' : undefined}
              showSearch
              optionFilterProp="label"
              options={rooms.map((r) => ({
                value: r.id,
                label: `${r.roomName} (${r.roomCode || r.location || 'Khu Lab'})`,
              }))}
            />
            {record.roomInput && (
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                Excel: <Tag style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>{record.roomInput}</Tag>
                {record.campus && <span style={{ marginLeft: 4 }}>• {record.campus}</span>}
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Giảng viên',
      key: 'teacher',
      width: 190,
      render: (_, record) => {
        return (
          <Space direction="vertical" size={3} style={{ width: '100%' }}>
            <Select
              style={{ width: '100%' }}
              size="small"
              placeholder={record.teacherInput ? `Gán GV (${record.teacherInput})` : 'Chọn giảng viên'}
              value={record.matchedUser?.id || defaultUserId}
              onChange={(newId) => handleRowUserChange(record.key, newId)}
              showSearch
              optionFilterProp="label"
              options={users.map((u) => ({
                value: u.id,
                label: `${u.fullName || u.username} (${u.role})`,
              }))}
            />
            {record.teacherInput && (
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                Excel: <Tag style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>{record.teacherInput}</Tag>
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Lịch & Khung giờ',
      key: 'schedule',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Space size={4}>
            <Tag color="orange" style={{ fontWeight: 600 }}>
              {record.dayOfWeekText}
            </Tag>
            <Text style={{ fontSize: 12 }}>
              {record.startDate} → {record.endDate}
            </Text>
          </Space>
          <Text style={{ fontSize: 12, fontWeight: 500, color: '#389e0d' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {record.timeRangeDisplay}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Số buổi',
      key: 'sessions',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Badge
          count={`${record.generatedDates.length} buổi`}
          style={{ backgroundColor: record.generatedDates.length > 1 ? '#52c41a' : '#1677ff' }}
        />
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 130,
      render: (_, record) =>
        record.isValid ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Hợp lệ
          </Tag>
        ) : (
          <Tooltip title={record.errorMessages.join('; ')}>
            <Tag icon={<ExclamationCircleOutlined />} color="error">
              {record.errorMessages[0]}
            </Tag>
          </Tooltip>
        ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a', fontSize: 22 }} />
          <span style={{ fontSize: 18, fontWeight: 600 }}>Import Lịch Thực Hành / Đặt Phòng từ Excel</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={1100}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<DownloadOutlined />} onClick={downloadSampleScheduleExcel}>
            Tải file mẫu TKB Excel
          </Button>

          <Space>
            {parsedData.length > 0 && (
              <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={submitting}>
                Chọn file khác
              </Button>
            )}
            <Button onClick={handleClose} disabled={submitting}>
              Đóng
            </Button>
            {parsedData.length > 0 && (
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={submitting}
                disabled={validRows.length === 0}
                onClick={handleSubmit}
                style={{
                  fontWeight: 600,
                  backgroundColor: validRows.length > 0 ? '#52c41a' : undefined,
                  borderColor: validRows.length > 0 ? '#52c41a' : undefined,
                }}
              >
                Xác nhận Import ({validRows.length} lớp - {totalSessionsToCreate} buổi học)
              </Button>
            )}
          </Space>
        </div>
      }
    >
      {parsedData.length === 0 ? (
        <div style={{ padding: '16px 0' }}>
          <Card style={{ marginBottom: 16, backgroundColor: '#fafafa' }} size="small">
            <Row gutter={[16, 12]} align="middle">
              <Col xs={24} md={14}>
                <Space align="center">
                  <SettingOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                  <div>
                    <Text strong>Tự động sinh các buổi học định kỳ hàng tuần</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tự động tính toán các ngày trong tuần từ Ngày BĐ đến Ngày KT theo Thứ quy định
                    </Text>
                  </div>
                </Space>
              </Col>
              <Col xs={24} md={10} style={{ textAlign: 'right' }}>
                <Switch
                  checked={autoRepeatWeekly}
                  onChange={setAutoRepeatWeekly}
                  checkedChildren="Bật (Chu kỳ tuần)"
                  unCheckedChildren="Chỉ ngày BĐ"
                />
              </Col>

              <Col xs={24}>
                <Space align="center" wrap>
                  <Text style={{ fontSize: 13 }}>Tài khoản gán mặc định nếu giảng viên chưa có user:</Text>
                  <Select
                    style={{ width: 260 }}
                    size="small"
                    value={defaultUserId}
                    onChange={setDefaultUserId}
                    options={users.map((u) => ({
                      value: u.id,
                      label: `${u.fullName || u.username} (${u.role})`,
                    }))}
                    placeholder="Chọn tài khoản gán mặc định"
                  />
                </Space>
              </Col>
            </Row>
          </Card>

          <Upload.Dragger
            accept=".xlsx, .xls, .csv"
            multiple={false}
            showUploadList={false}
            beforeUpload={(file) => {
              handleFileChange(file);
              return false;
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#52c41a', fontSize: 52 }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 600 }}>
              Kéo thả file Excel Thời khóa biểu vào đây hoặc bấm để tải lên
            </p>
            <p className="ant-upload-hint" style={{ color: '#666' }}>
              Hỗ trợ đầy đủ định dạng file TKB Thực hành chuẩn (các cột: TT, Mã HP, Số TC, Lớp học phần, Ngày BĐ, Ngày KT, Thứ, Tiết BĐ, Số tiết, Phòng học, Giáo Viên...)
            </p>
          </Upload.Dragger>
        </div>
      ) : (
        <div>
          <Alert
            type={invalidRowsCount > 0 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 12 }}
            message={
              <span>
                File: <b>{fileName}</b> | Đã đọc <b>{parsedData.length}</b> dòng học phần (
                <b>{validRows.length}</b> hợp lệ, tương ứng <b>{totalSessionsToCreate}</b> buổi học).
              </span>
            }
          />

          {/* Card Thống kê */}
          <Row gutter={12} style={{ marginBottom: 12 }}>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#f0f5ff', borderColor: '#adc6ff' }}>
                <Statistic
                  title="Tổng lớp học phần"
                  value={parsedData.length}
                  prefix={<CalendarOutlined style={{ color: '#2f54eb' }} />}
                  valueStyle={{ color: '#2f54eb', fontWeight: 600, fontSize: 20 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Statistic
                  title="Học phần hợp lệ"
                  value={validRows.length}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontWeight: 600, fontSize: 20 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#e6fffb', borderColor: '#87e8de' }}>
                <Statistic
                  title="Tổng số buổi sẽ tạo"
                  value={totalSessionsToCreate}
                  prefix={<ClockCircleOutlined style={{ color: '#13c2c2' }} />}
                  valueStyle={{ color: '#13c2c2', fontWeight: 600, fontSize: 20 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card
                size="small"
                style={{
                  backgroundColor: invalidRowsCount > 0 ? '#fff1f0' : '#fafafa',
                  borderColor: invalidRowsCount > 0 ? '#ffa39e' : '#d9d9d9',
                }}
              >
                <Statistic
                  title="Dòng bị lỗi / thiếu phòng"
                  value={invalidRowsCount}
                  prefix={<ExclamationCircleOutlined style={{ color: invalidRowsCount > 0 ? '#f5222d' : '#8c8c8c' }} />}
                  valueStyle={{ color: invalidRowsCount > 0 ? '#f5222d' : '#8c8c8c', fontWeight: 600, fontSize: 20 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Thanh công cụ tìm kiếm và cấu hình */}
          <Card size="small" style={{ marginBottom: 12 }}>
            <Row gutter={[12, 8]} align="middle" justify="space-between">
              <Col xs={24} md={12}>
                <Space>
                  <Input
                    placeholder="Tìm theo môn học, phòng máy, giảng viên..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 280 }}
                  />
                  <Select
                    value={filterValid}
                    onChange={setFilterValid}
                    style={{ width: 150 }}
                    options={[
                      { value: 'ALL', label: 'Tất cả trạng thái' },
                      { value: 'VALID', label: 'Chỉ dòng hợp lệ' },
                      { value: 'INVALID', label: 'Chỉ dòng bị lỗi' },
                    ]}
                  />
                </Space>
              </Col>

              <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                <Space>
                  <Text style={{ fontSize: 13 }}>Sinh định kỳ tuần:</Text>
                  <Switch
                    checked={autoRepeatWeekly}
                    onChange={setAutoRepeatWeekly}
                    checkedChildren="Bật"
                    unCheckedChildren="Tắt"
                    disabled={submitting}
                  />
                </Space>
              </Col>
            </Row>
          </Card>

          {submitting && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>Đang tiến hành import lịch vào hệ thống...</Text>
              <Progress percent={progressPercent} status={progressStatus} strokeColor="#52c41a" />
            </div>
          )}

          {invalidRowsCount > 0 && (
            <Alert
              type="warning"
              showIcon
              message={
                <span>
                  Có <b>{invalidRowsCount}</b> dòng có phòng học chưa tồn tại trong hệ thống.
                  Các dòng này sẽ được bỏ qua khi import. Bạn có thể thêm phòng máy tương ứng tại trang <b>Quản lý phòng máy</b> trước khi import.
                </span>
              }
              style={{ marginBottom: 12 }}
            />
          )}

          <Table
            columns={columns}
            dataSource={displayData}
            rowKey="key"
            size="small"
            loading={parsing}
            pagination={{
              pageSize: 6,
              showSizeChanger: true,
              pageSizeOptions: ['6', '12', '24', '50'],
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} lớp học phần`,
            }}
            scroll={{ y: 320 }}
          />
        </div>
      )}
    </Modal>
  );
};
