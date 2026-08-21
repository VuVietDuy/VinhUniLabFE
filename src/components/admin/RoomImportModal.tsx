import React, { useState } from 'react';
import { Modal, Upload, Button, Table, Tag, Space, Alert, Typography, message, Tooltip, Progress } from 'antd';
import {
  InboxOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { parseRoomsFromExcel, downloadSampleExcel, type ParsedRoomRow } from '../../utils/excelParser';
import { roomApi, type Room } from '../../api/room';
import { getApiErrorMessage } from '../../utils/apiError';

const { Text, Title } = Typography;

interface RoomImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RoomImportModal: React.FC<RoomImportModalProps> = ({ open, onClose, onSuccess }) => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<ParsedRoomRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const handleReset = () => {
    setFileList([]);
    setParsedData([]);
    setFileName('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Xử lý đọc file Excel khi người dùng chọn file
  const handleFileChange = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const results = await parseRoomsFromExcel(file);
      setParsedData(results);
      if (results.length === 0) {
        message.warning('Không tìm thấy dữ liệu trong file Excel');
      } else {
        const validCount = results.filter((r) => r.isValid).length;
        message.success(`Đã đọc ${results.length} dòng (${validCount} phòng hợp lệ)`);
      }
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file!');
      handleReset();
    } finally {
      setParsing(false);
    }
  };

  // Lọc lấy danh sách các entity phòng máy hợp lệ để gửi cho Backend
  const validRooms = parsedData.filter((r) => r.isValid);
  const invalidRoomsCount = parsedData.length - validRooms.length;

  // Gửi request POST /saveAll tới backend
  const handleSubmit = async () => {
    if (validRooms.length === 0) {
      message.error('Không có phòng máy nào hợp lệ để import');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Room>[] = validRooms.map((r) => ({
        roomCode: r.roomCode,
        roomName: r.roomName,
        location: r.location,
        totalSeats: r.totalSeats,
        isActive: r.isActive,
      }));

      await roomApi.saveAll(payload);
      message.success(`Import thành công ${validRooms.length} phòng máy vào hệ thống!`);
      onSuccess();
      handleClose();
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Import danh sách phòng máy thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  // Cấu hình bảng hiển thị dữ liệu đã đọc
  const columns: ColumnsType<ParsedRoomRow> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Mã phòng',
      dataIndex: 'roomCode',
      key: 'roomCode',
      width: 120,
      render: (code: string, record) => (
        <Tag color={record.roomCode ? 'blue' : 'red'} style={{ fontWeight: 600 }}>
          {code || 'Thiếu mã'}
        </Tag>
      ),
    },
    {
      title: 'Tên phòng máy',
      dataIndex: 'roomName',
      key: 'roomName',
      render: (name: string) => (
        <span style={{ fontWeight: 500, color: name ? '#1677ff' : '#ff4d4f' }}>
          {name || '(Chưa nhập tên phòng)'}
        </span>
      ),
    },
    {
      title: 'Vị trí',
      dataIndex: 'location',
      key: 'location',
      width: 140,
    },
    {
      title: 'Số ghế',
      dataIndex: 'totalSeats',
      key: 'totalSeats',
      width: 90,
      render: (seats: number) => `${seats} ghế`,
    },
    {
      title: 'Trạng thái phòng',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'error'}>{active ? 'Hoạt động' : 'Bảo trì'}</Tag>
      ),
    },
    {
      title: 'Trạng thái dữ liệu',
      key: 'isValid',
      width: 150,
      render: (_, record) =>
        record.isValid ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Hợp lệ
          </Tag>
        ) : (
          <Tooltip title={record.errorMessages.join(', ')}>
            <Tag icon={<ExclamationCircleOutlined />} color="error">
              Lỗi: {record.errorMessages[0]}
            </Tag>
          </Tooltip>
        ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          <span>Import danh sách phòng máy từ Excel</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={900}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<DownloadOutlined />} onClick={downloadSampleExcel}>
            Tải file mẫu Excel
          </Button>

          <Space>
            {parsedData.length > 0 && (
              <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={submitting}>
                Chọn file khác
              </Button>
            )}
            <Button onClick={handleClose} disabled={submitting}>
              Hủy
            </Button>
            {parsedData.length > 0 && (
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={submitting}
                disabled={validRooms.length === 0}
                onClick={handleSubmit}
                style={{ fontWeight: 600, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Xác nhận Import ({validRooms.length} phòng)
              </Button>
            )}
          </Space>
        </div>
      }
    >
      {parsedData.length === 0 ? (
        <div style={{ padding: '20px 0' }}>
          <Upload.Dragger
            accept=".xlsx, .xls, .csv"
            multiple={false}
            showUploadList={false}
            beforeUpload={(file) => {
              handleFileChange(file);
              return false; // Ngăn AntD tự động upload mặc định
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#1677ff', fontSize: 48 }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500 }}>
              Kéo thả file Excel vào đây hoặc bấm để chọn file
            </p>
            <p className="ant-upload-hint">
              Hỗ trợ các định dạng .xlsx, .xls, .csv. Bạn có thể bấm "Tải file mẫu Excel" bên dưới để xem cấu trúc file chuẩn.
            </p>
          </Upload.Dragger>
        </div>
      ) : (
        <div>
          <Alert
            style={{ marginBottom: 16 }}
            type={invalidRoomsCount > 0 ? 'warning' : 'success'}
            showIcon
            message={
              <span>
                File <b>{fileName}</b>: Đã đọc <b>{parsedData.length}</b> dòng phòng máy.{' '}
                <Tag color="success">{validRooms.length} hợp lệ</Tag>
                {invalidRoomsCount > 0 && <Tag color="error">{invalidRoomsCount} dòng bị lỗi</Tag>}
              </span>
            }
            description={
              invalidRoomsCount > 0
                ? 'Các dòng bị lỗi thiếu thông tin bắt buộc (Mã phòng, Tên phòng) sẽ bị loại bỏ khi Import.'
                : 'Tất cả dữ liệu đã sẵn sàng để lưu vào cơ sở dữ liệu.'
            }
          />

          <Table
            columns={columns}
            dataSource={parsedData}
            rowKey="key"
            size="small"
            loading={parsing}
            pagination={{ pageSize: 5, showSizeChanger: true, pageSizeOptions: ['5', '10', '20'] }}
            scroll={{ y: 320 }}
          />
        </div>
      )}
    </Modal>
  );
};
