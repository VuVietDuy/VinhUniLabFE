import React, { useState } from 'react';
import { Modal, Upload, Button, Table, Tag, Space, Alert, Typography, message, Tooltip } from 'antd';
import {
  InboxOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  parseComputersFromExcel,
  downloadSampleComputerExcel,
  type ParsedComputerRow,
} from '../../utils/excelParser';
import { computerApi, type Computer, type ComputerStatus } from '../../api/computer';
import type { Room } from '../../api/room';
import { getApiErrorMessage } from '../../utils/apiError';
import { statusMap } from '../../pages/admin/ComputerManagement';

interface ComputerImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rooms: Room[];
}

export const ComputerImportModal: React.FC<ComputerImportModalProps> = ({
  open,
  onClose,
  onSuccess,
  rooms,
}) => {
  const [parsedData, setParsedData] = useState<ParsedComputerRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const handleReset = () => {
    setParsedData([]);
    setFileName('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Đọc file Excel chọn từ máy tính
  const handleFileChange = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const results = await parseComputersFromExcel(file, rooms);
      setParsedData(results);
      if (results.length === 0) {
        message.warning('Không tìm thấy dữ liệu trong file Excel');
      } else {
        const validCount = results.filter((r) => r.isValid).length;
        message.success(`Đã đọc ${results.length} dòng (${validCount} máy tính hợp lệ)`);
      }
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file!');
      handleReset();
    } finally {
      setParsing(false);
    }
  };

  const validComputers = parsedData.filter((r) => r.isValid);
  const invalidComputersCount = parsedData.length - validComputers.length;

  // Gửi request POST /admin/computers/saveAll
  const handleSubmit = async () => {
    if (validComputers.length === 0) {
      message.error('Không có máy tính nào hợp lệ để import');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Computer>[] = validComputers.map((c) => ({
        computerCode: c.computerCode,
        roomId: c.roomId,
        room: { id: c.roomId } as any,
        specs: c.specs,
        status: c.status,
      }));

      await computerApi.saveAll(payload);
      message.success(`Import thành công ${validComputers.length} máy tính vào hệ thống!`);
      onSuccess();
      handleClose();
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Import danh sách máy tính thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  // Columns hiển thị bảng xem trước
  const columns: ColumnsType<ParsedComputerRow> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Mã máy tính',
      dataIndex: 'computerCode',
      key: 'computerCode',
      width: 140,
      render: (code: string, record) => (
        <Space align="center">
          <DesktopOutlined style={{ color: record.isValid ? '#1677ff' : '#ff4d4f' }} />
          <Tag color={code ? 'blue' : 'red'} style={{ fontWeight: 600 }}>
            {code || 'Thiếu mã'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Phòng máy',
      key: 'roomName',
      width: 180,
      render: (_, record) => (
        <Tag color={record.roomId ? 'cyan' : 'volcano'}>
          {record.roomName || record.roomCodeOrName || 'Chưa có phòng'}
        </Tag>
      ),
    },
    {
      title: 'Cấu hình phần cứng',
      dataIndex: 'specs',
      key: 'specs',
      ellipsis: true,
      render: (specs: string) => <span>{specs || 'Core i5 / RAM 16GB'}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: ComputerStatus) => {
        const item = statusMap[status] || statusMap.AVAILABLE;
        return <Tag color={item.color} icon={item.icon}>{item.label}</Tag>;
      },
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
          <span>Import danh sách máy tính từ Excel</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={920}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<DownloadOutlined />} onClick={() => downloadSampleComputerExcel(rooms)}>
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
                disabled={validComputers.length === 0}
                onClick={handleSubmit}
                style={{ fontWeight: 600, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Xác nhận Import ({validComputers.length} máy)
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
              return false;
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#1677ff', fontSize: 48 }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500 }}>
              Kéo thả file Excel máy tính vào đây hoặc bấm để chọn file
            </p>
            <p className="ant-upload-hint">
              Hỗ trợ các file .xlsx, .xls, .csv. File Excel gồm các cột: Mã máy tính, Phòng máy (nhập Mã phòng, ID phòng hoặc Tên phòng), Cấu hình phần cứng, Trạng thái.
            </p>
          </Upload.Dragger>
        </div>
      ) : (
        <div>
          <Alert
            style={{ marginBottom: 16 }}
            type={invalidComputersCount > 0 ? 'warning' : 'success'}
            showIcon
            message={
              <span>
                File <b>{fileName}</b>: Đã đọc <b>{parsedData.length}</b> dòng máy tính.{' '}
                <Tag color="success">{validComputers.length} hợp lệ</Tag>
                {invalidComputersCount > 0 && (
                  <Tag color="error">{invalidComputersCount} dòng bị lỗi</Tag>
                )}
              </span>
            }
            description={
              invalidComputersCount > 0
                ? 'Các dòng bị lỗi (thiếu Mã máy hoặc Phòng máy không tồn tại trong hệ thống) sẽ bị bỏ qua khi Import.'
                : 'Tất cả dữ liệu máy tính đã sẵn sàng để tạo vào cơ sở dữ liệu.'
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
