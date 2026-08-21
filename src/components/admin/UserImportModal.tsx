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
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  parseUsersFromExcel,
  downloadSampleUserExcel,
  type ParsedUserRow,
} from '../../utils/excelParser';
import { userApi, type User, type UserRole } from '../../api/user';
import { getApiErrorMessage } from '../../utils/apiError';

interface UserImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const roleLabelMap: Record<UserRole, { label: string; color: string }> = {
  ADMIN: { label: 'Quản trị viên', color: 'magenta' },
  TEACHER: { label: 'Giáo viên', color: 'blue' },
  TECHNICIAN: { label: 'Kỹ thuật viên', color: 'orange' },
};

export const UserImportModal: React.FC<UserImportModalProps> = ({ open, onClose, onSuccess }) => {
  const [parsedData, setParsedData] = useState<ParsedUserRow[]>([]);
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

  // Đọc file Excel người dùng
  const handleFileChange = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const results = await parseUsersFromExcel(file);
      setParsedData(results);
      if (results.length === 0) {
        message.warning('Không tìm thấy dữ liệu trong file Excel');
      } else {
        const validCount = results.filter((r) => r.isValid).length;
        message.success(`Đã đọc ${results.length} dòng (${validCount} người dùng hợp lệ)`);
      }
    } catch (error: any) {
      message.error(error.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file!');
      handleReset();
    } finally {
      setParsing(false);
    }
  };

  const validUsers = parsedData.filter((r) => r.isValid);
  const invalidUsersCount = parsedData.length - validUsers.length;

  // Gửi request POST /admin/users/saveAll
  const handleSubmit = async () => {
    if (validUsers.length === 0) {
      message.error('Không có người dùng nào hợp lệ để import');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<User>[] = validUsers.map((u) => ({
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        password: u.password || '123456',
      }));

      await userApi.saveAll(payload);
      message.success(`Import thành công ${validUsers.length} tài khoản người dùng vào hệ thống!`);
      onSuccess();
      handleClose();
    } catch (error) {
      message.error(getApiErrorMessage(error, 'Import danh sách người dùng thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  // Columns hiển thị bảng xem trước
  const columns: ColumnsType<ParsedUserRow> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
      width: 140,
      render: (text: string, record) => (
        <Space align="center">
          <UserOutlined style={{ color: record.isValid ? '#1677ff' : '#ff4d4f' }} />
          <span style={{ fontWeight: 600, color: text ? '#1677ff' : '#ff4d4f' }}>
            {text || '(Thiếu username)'}
          </span>
        </Space>
      ),
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text: string) => <span>{text || '(Chưa nhập tên)'}</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <span>{email || '(Thiếu email)'}</span>,
    },
    {
      title: 'Quyền hạn',
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (role: UserRole) => {
        const info = roleLabelMap[role] || { label: role, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: 'Mật khẩu',
      dataIndex: 'password',
      key: 'password',
      width: 110,
      render: (pwd: string) => <Tag color="geekblue">{pwd || '123456'}</Tag>,
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
          <span>Import danh sách người dùng từ Excel</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={920}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<DownloadOutlined />} onClick={downloadSampleUserExcel}>
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
                disabled={validUsers.length === 0}
                onClick={handleSubmit}
                style={{ fontWeight: 600, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Xác nhận Import ({validUsers.length} tài khoản)
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
              Kéo thả file Excel người dùng vào đây hoặc bấm để chọn file
            </p>
            <p className="ant-upload-hint">
              Hỗ trợ file .xlsx, .xls, .csv. File Excel chứa các cột: Tên đăng nhập, Họ và tên, Email, Mật khẩu (tùy chọn, mặc định: 123456), Quyền hạn (ADMIN/TEACHER/TECHNICIAN).
            </p>
          </Upload.Dragger>
        </div>
      ) : (
        <div>
          <Alert
            style={{ marginBottom: 16 }}
            type={invalidUsersCount > 0 ? 'warning' : 'success'}
            showIcon
            message={
              <span>
                File <b>{fileName}</b>: Đã đọc <b>{parsedData.length}</b> dòng tài khoản.{' '}
                <Tag color="success">{validUsers.length} hợp lệ</Tag>
                {invalidUsersCount > 0 && <Tag color="error">{invalidUsersCount} dòng bị lỗi</Tag>}
              </span>
            }
            description={
              invalidUsersCount > 0
                ? 'Các dòng bị lỗi (thiếu tên đăng nhập, thiếu họ tên hoặc email không hợp lệ) sẽ bị bỏ qua khi Import.'
                : 'Tất cả dữ liệu tài khoản đã sẵn sàng để tạo vào cơ sở dữ liệu.'
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
