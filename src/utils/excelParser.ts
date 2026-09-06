import * as XLSX from 'xlsx';
import type { Room } from '../api/room';
import type { Computer, ComputerStatus } from '../api/computer';
import type { User, UserRole } from '../api/user';
import type { Incident, IncidentStatus, Priority } from '../api/incident';
import type { Booking, BookingStatus } from '../api/booking';
import type { TimeSlot } from '../api/timeSlot';

/**
 * Chuẩn hóa chuỗi (bỏ dấu tiếng Việt bao gồm đ/Đ, chuyển về chữ thường, xóa khoảng trắng thừa)
 */
export const cleanString = (str: any): string => {
  if (str === undefined || str === null) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Hàm lấy giá trị cột từ row theo danh sách từ khóa tìm kiếm (hỗ trợ cả khớp chính xác & tương đối)
 */
const getRowValue = (normalizedRow: Record<string, any>, keys: string[]): string => {
  // 1. Khớp chính xác tiêu đề đã làm sạch
  for (const k of keys) {
    const cleanK = cleanString(k);
    if (
      normalizedRow[cleanK] !== undefined &&
      normalizedRow[cleanK] !== null &&
      String(normalizedRow[cleanK]).trim() !== ''
    ) {
      return String(normalizedRow[cleanK]).trim();
    }
  }

  // 2. Khớp tương đối (nếu tiêu đề cột trong Excel chứa từ khóa tìm kiếm)
  for (const normKey of Object.keys(normalizedRow)) {
    for (const k of keys) {
      const cleanK = cleanString(k);
      if (normKey.includes(cleanK)) {
        if (
          normalizedRow[normKey] !== undefined &&
          normalizedRow[normKey] !== null &&
          String(normalizedRow[normKey]).trim() !== ''
        ) {
          return String(normalizedRow[normKey]).trim();
        }
      }
    }
  }
  return '';
};

// ==========================================
// PHÒNG MÁY (ROOM) EXCEL PARSER & EXPORTER
// ==========================================

export interface ParsedRoomRow {
  key: string;
  roomCode: string;
  roomName: string;
  location: string;
  totalSeats: number;
  isActive: boolean;
  isValid: boolean;
  errorMessages: string[];
}

export const parseRoomsFromExcel = async (file: File): Promise<ParsedRoomRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File Excel không có sheet dữ liệu nào');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsedRows: ParsedRoomRow[] = rawRows.map((row, index) => {
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[cleanString(key)] = row[key];
          });

          const roomCode = getRowValue(normalizedRow, [
            'roomcode',
            'code',
            'ma phong',
            'ma phong may',
            'maphong',
            'maphongmay',
          ]);

          const roomName = getRowValue(normalizedRow, [
            'roomname',
            'name',
            'ten phong',
            'ten phong may',
            'tenphong',
            'tenphongmay',
          ]);

          const location =
            getRowValue(normalizedRow, [
              'location',
              'vi tri',
              'vitri',
              'toa nha',
              'tang',
              'toa nha/tang',
            ]) || 'Khu nhà Lab';

          const seatsRaw = getRowValue(normalizedRow, [
            'totalseats',
            'seats',
            'so luong ghe',
            'so ghe',
            'soluongghe',
            'soghe',
            'suc chua',
          ]);
          let totalSeats = parseInt(seatsRaw, 10);
          if (isNaN(totalSeats) || totalSeats <= 0) {
            totalSeats = 30;
          }

          const activeRaw = getRowValue(normalizedRow, ['isactive', 'active', 'trang thai', 'trangthai']);
          let isActive = true;
          if (activeRaw) {
            const cleanActive = cleanString(activeRaw);
            if (
              ['false', '0', 'bao tri', 'ngung hoat dong', 'khong', 'inactive'].some((str) =>
                cleanActive.includes(str)
              )
            ) {
              isActive = false;
            }
          }

          const errorMessages: string[] = [];
          if (!roomCode) errorMessages.push('Thiếu mã phòng');
          if (!roomName) errorMessages.push('Thiếu tên phòng');

          return {
            key: `room-row-${index}`,
            roomCode,
            roomName,
            location,
            totalSeats,
            isActive,
            isValid: errorMessages.length === 0,
            errorMessages,
          };
        });

        resolve(parsedRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const downloadSampleExcel = () => {
  const sampleData = [
    {
      'Mã phòng': 'LAB-101',
      'Tên phòng': 'Phòng Lab 101 (Lập trình Java)',
      'Vị trí': 'Tầng 1 - Nhà A1',
      'Số lượng ghế': 35,
      'Trạng thái': 'Hoạt động',
    },
    {
      'Mã phòng': 'LAB-102',
      'Tên phòng': 'Phòng Lab 102 (Mạng máy tính)',
      'Vị trí': 'Tầng 1 - Nhà A1',
      'Số lượng ghế': 40,
      'Trạng thái': 'Hoạt động',
    },
    {
      'Mã phòng': 'LAB-201',
      'Tên phòng': 'Phòng Lab 201 (Hệ điều hành)',
      'Vị trí': 'Tầng 2 - Nhà A1',
      'Số lượng ghế': 30,
      'Trạng thái': 'Bảo trì',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachPhongMay');

  XLSX.writeFile(workbook, 'Mau_Import_Phong_May.xlsx');
};

export const exportRoomsToExcel = (rooms: Room[], filename = 'Danh_Sach_Phong_May.xlsx') => {
  const exportData = rooms.map((room, index) => ({
    STT: index + 1,
    'Mã phòng': room.roomCode || '',
    'Tên phòng máy': room.roomName || '',
    'Vị trí': room.location || 'Khu nhà Lab',
    'Số ghế': room.totalSeats || 0,
    'Số máy tính': room.computers?.length || 0,
    'Trạng thái': room.isActive ? 'Hoạt động' : 'Bảo trì',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 35 },
    { wch: 25 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachPhongMay');

  XLSX.writeFile(workbook, filename);
};

// ==========================================
// MÁY TÍNH (COMPUTER) EXCEL PARSER & EXPORTER
// ==========================================

export interface ParsedComputerRow {
  key: string;
  computerCode: string;
  roomId: number;
  roomCodeOrName: string;
  roomName?: string;
  specs: string;
  status: ComputerStatus;
  isValid: boolean;
  errorMessages: string[];
}

export const parseComputersFromExcel = async (
  file: File,
  existingRooms: Room[] = []
): Promise<ParsedComputerRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File Excel không có sheet dữ liệu nào');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsedRows: ParsedComputerRow[] = rawRows.map((row, index) => {
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[cleanString(key)] = row[key];
          });

          const computerCode = getRowValue(normalizedRow, [
            'computercode',
            'code',
            'ma may',
            'ma may tinh',
            'mamay',
            'mamaytinh',
          ]);

          const roomInput = getRowValue(normalizedRow, [
            'roomcode',
            'roomid',
            'roomname',
            'room',
            'phong may',
            'thuoc phong may',
            'ma phong',
            'id phong',
            'ten phong',
            'phong',
            'maphong',
            'idphong',
            'tenphong',
          ]);

          let matchedRoom: Room | undefined = undefined;
          if (roomInput) {
            const cleanInput = cleanString(roomInput);
            matchedRoom = existingRooms.find(
              (r) =>
                (r.roomCode && cleanString(r.roomCode) === cleanInput) ||
                String(r.id) === roomInput.trim() ||
                (r.roomName && cleanString(r.roomName) === cleanInput)
            );
          }

          const specs =
            getRowValue(normalizedRow, ['specs', 'specification', 'cau hinh', 'cau hinh phan cung', 'cauhinh']) ||
            'Core i5 / RAM 16GB / SSD 256GB';

          const statusRaw = getRowValue(normalizedRow, ['status', 'trang thai', 'trangthai']);
          let status: ComputerStatus = 'AVAILABLE';
          if (statusRaw) {
            const cleanStatus = cleanString(statusRaw);
            if (
              cleanStatus.includes('su dung') ||
              cleanStatus.includes('in_use') ||
              cleanStatus.includes('dang dung')
            ) {
              status = 'IN_USE';
            } else if (
              cleanStatus.includes('bao tri') ||
              cleanStatus.includes('maintenance')
            ) {
              status = 'MAINTENANCE';
            } else if (
              cleanStatus.includes('hong') ||
              cleanStatus.includes('broken')
            ) {
              status = 'BROKEN';
            }
          }

          const errorMessages: string[] = [];
          if (!computerCode) errorMessages.push('Thiếu mã máy tính');
          if (!roomInput) {
            errorMessages.push('Thiếu thông tin phòng máy');
          } else if (!matchedRoom) {
            errorMessages.push(`Không tìm thấy phòng máy có Mã/ID hoặc Tên "${roomInput}" trong hệ thống`);
          }

          return {
            key: `comp-row-${index}`,
            computerCode,
            roomId: matchedRoom ? matchedRoom.id : 0,
            roomCodeOrName: roomInput,
            roomName: matchedRoom ? matchedRoom.roomName : roomInput,
            specs,
            status,
            isValid: errorMessages.length === 0,
            errorMessages,
          };
        });

        resolve(parsedRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const downloadSampleComputerExcel = (rooms: Room[] = []) => {
  const room1 = rooms.length > 0 ? (rooms[0].roomCode || String(rooms[0].id)) : 'LAB-101';
  const room2 = rooms.length > 1 ? (rooms[1].roomCode || String(rooms[1].id)) : 'LAB-102';

  const sampleData = [
    {
      'Mã máy tính': 'LAB1-PC01',
      'Mã hoặc ID phòng': room1,
      'Cấu hình phần cứng': 'Intel Core i5-12400, RAM 16GB, SSD 512GB, Monitor 24 inch',
      'Trạng thái': 'Sẵn sàng',
    },
    {
      'Mã máy tính': 'LAB1-PC02',
      'Mã hoặc ID phòng': room1,
      'Cấu hình phần cứng': 'Intel Core i5-12400, RAM 16GB, SSD 512GB, Monitor 24 inch',
      'Trạng thái': 'Sẵn sàng',
    },
    {
      'Mã máy tính': 'LAB2-PC01',
      'Mã hoặc ID phòng': room2,
      'Cấu hình phần cứng': 'Intel Core i7-12700, RAM 32GB, SSD 1TB, RTX 3060',
      'Trạng thái': 'Bảo trì',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachMayTinh');

  XLSX.writeFile(workbook, 'Mau_Import_May_Tinh.xlsx');
};

export const exportComputersToExcel = (
  computers: Computer[],
  rooms: Room[] = [],
  filename = 'Danh_Sach_May_Tinh.xlsx'
) => {
  const exportData = computers.map((comp, index) => {
    const matchedRoom = rooms.find((r) => r.id === (comp.roomId || comp.room?.id));
    const roomName = matchedRoom ? matchedRoom.roomName : comp.roomName || `ID: ${comp.roomId}`;

    let statusStr = 'Sẵn sàng';
    if (comp.status === 'IN_USE') statusStr = 'Đang sử dụng';
    else if (comp.status === 'MAINTENANCE') statusStr = 'Đang bảo trì';
    else if (comp.status === 'BROKEN') statusStr = 'Bị hỏng';

    return {
      STT: index + 1,
      'Mã máy tính': comp.computerCode || '',
      'Thuộc phòng máy': roomName,
      'Cấu hình phần cứng': comp.specs || 'Mặc định',
      'Trạng thái': statusStr,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 30 },
    { wch: 45 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachMayTinh');

  XLSX.writeFile(workbook, filename);
};

// ==========================================
// NGƯỜI DÙNG (USER) EXCEL PARSER & EXPORTER
// ==========================================

export interface ParsedUserRow {
  key: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  password?: string;
  isValid: boolean;
  errorMessages: string[];
}

export const parseUsersFromExcel = async (file: File): Promise<ParsedUserRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File Excel không có sheet dữ liệu nào');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsedRows: ParsedUserRow[] = rawRows.map((row, index) => {
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[cleanString(key)] = row[key];
          });

          // 1. Tên đăng nhập / Username
          const username = getRowValue(normalizedRow, [
            'username',
            'user',
            'ten dang nhap',
            'tendangnhap',
            'ten tai khoan',
            'tentaikhoan',
            'tai khoan',
            'taikhoan',
            'ma nguoi dung',
            'manguoidung',
            'login',
          ]);

          // 2. Họ và tên
          const fullName = getRowValue(normalizedRow, [
            'fullname',
            'ho va ten',
            'hovatenc',
            'ho ten',
            'hoten',
            'ten nguoi dung',
            'tennguoidung',
            'name',
          ]);

          // 3. Email
          const email = getRowValue(normalizedRow, ['email', 'mail', 'thu dien tu', 'thudientu']);

          // 4. Mật khẩu
          const password = getRowValue(normalizedRow, ['password', 'mat khau', 'matkhau', 'pass']) || '123456';

          // 5. Quyền hạn / Role
          const roleRaw = getRowValue(normalizedRow, [
            'role',
            'quyen han',
            'quyenhan',
            'quyen',
            'chuc vu',
            'chucvu',
            'phan quyen',
          ]);
          let role: UserRole = 'TEACHER';
          if (roleRaw) {
            const cleanRole = cleanString(roleRaw);
            if (
              cleanRole.includes('admin') ||
              cleanRole.includes('quan tri') ||
              cleanRole.includes('qtv')
            ) {
              role = 'ADMIN';
            } else if (
              cleanRole.includes('technician') ||
              cleanRole.includes('ky thuat') ||
              cleanRole.includes('ktv')
            ) {
              role = 'TECHNICIAN';
            } else if (
              cleanRole.includes('teacher') ||
              cleanRole.includes('giao vien') ||
              cleanRole.includes('gv')
            ) {
              role = 'TEACHER';
            }
          }

          const errorMessages: string[] = [];
          if (!username) errorMessages.push('Thiếu tên đăng nhập');
          if (!fullName) errorMessages.push('Thiếu họ và tên');
          if (!email) {
            errorMessages.push('Thiếu email');
          } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              errorMessages.push('Email không hợp lệ');
            }
          }

          return {
            key: `user-row-${index}`,
            username,
            fullName,
            email,
            password,
            role,
            isValid: errorMessages.length === 0,
            errorMessages,
          };
        });

        resolve(parsedRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const downloadSampleUserExcel = () => {
  const sampleData = [
    {
      'Tên đăng nhập': 'teacher_01',
      'Mật khẩu': '123456',
      'Họ và tên': 'Nguyễn Văn A',
      'Email': 'nguyenvana@vinhuni.edu.vn',
      'Quyền hạn': 'Giáo viên',
    },
    {
      'Tên đăng nhập': 'tech_01',
      'Mật khẩu': '123456',
      'Họ và tên': 'Trần Văn B',
      'Email': 'tranvanb@vinhuni.edu.vn',
      'Quyền hạn': 'Kỹ thuật viên',
    },
    {
      'Tên đăng nhập': 'admin_02',
      'Mật khẩu': '123456',
      'Họ và tên': 'Lê Thị C',
      'Email': 'lethic@vinhuni.edu.vn',
      'Quyền hạn': 'Quản trị viên',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachNguoiDung');

  XLSX.writeFile(workbook, 'Mau_Import_Nguoi_Dung.xlsx');
};

export const exportUsersToExcel = (users: User[], filename = 'Danh_Sach_Nguoi_Dung.xlsx') => {
  const roleLabelMap: Record<UserRole, string> = {
    ADMIN: 'Quản trị viên',
    TEACHER: 'Giáo viên',
    TECHNICIAN: 'Kỹ thuật viên',
  };

  const exportData = users.map((u, index) => ({
    STT: index + 1,
    'Tên đăng nhập': u.username || '',
    'Họ và tên': u.fullName || '',
    Email: u.email || '',
    'Quyền hạn': roleLabelMap[u.role] || u.role,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 28 },
    { wch: 32 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachNguoiDung');

  XLSX.writeFile(workbook, filename);
};

// ==========================================
// BÁO CÁO SỰ CỐ (INCIDENT) EXPORTER
// ==========================================

export const exportIncidentsToExcel = (
  incidents: Incident[],
  rooms: Room[] = [],
  filename = 'Danh_Sach_Bao_Cao_Su_Co.xlsx'
) => {
  const statusLabelMap: Record<IncidentStatus, string> = {
    OPEN: 'Mới tiếp nhận',
    IN_PROGRESS: 'Đang sửa chữa',
    RESOLVED: 'Đã khắc phục',
    CLOSED: 'Đã đóng',
  };

  const priorityLabelMap: Record<Priority, string> = {
    LOW: 'Thấp (Nhẹ)',
    NORMAL: 'Trung bình',
    HIGH: 'Khẩn cấp',
  };

  const roomMap = new Map<number, string>();
  rooms.forEach(r => roomMap.set(r.id, r.roomName));

  const exportData = incidents.map((inc, index) => {
    const computer = inc as Incident & { computer?: { computerCode?: string; roomId?: number; roomName?: string; room?: { roomName?: string } } };
    const roomName =
      (inc.computer?.roomId ? roomMap.get(inc.computer.roomId) : undefined) ||
      computer.computer?.room?.roomName ||
      computer.computer?.roomName ||
      inc.roomName ||
      'Khu Lab';

    const computerCode =
      inc.computer?.computerCode ||
      computer.computer?.computerCode ||
      (inc.computerId ? `Máy #${inc.computerId}` : '');

    const reporterName =
      inc.reportedBy?.fullName ||
      inc.reportedBy?.username ||
      'Giảng viên';

    const technicianName =
      inc.assignedTo?.fullName ||
      (inc as any).technician?.fullName ||
      inc.assignedTo?.username ||
      'Chưa phân công';

    const createdAtStr = inc.createdAt
      ? new Date(inc.createdAt).toLocaleString('vi-VN')
      : '';
    const resolvedAtStr = inc.resolvedAt
      ? new Date(inc.resolvedAt).toLocaleString('vi-VN')
      : 'Chưa xử lý';

    return {
      STT: index + 1,
      'Mã sự cố': `INC-${inc.id}`,
      'Mức độ': priorityLabelMap[inc.priority] || inc.priority || '',
      'Trạng thái': statusLabelMap[inc.status] || inc.status || '',
      'Phòng máy': roomName,
      'Mã máy tính': computerCode,
      'Mô tả sự cố': inc.description || '',
      'Người báo cáo': reporterName,
      'KTV phụ trách': technicianName,
      'Thời gian báo cáo': createdAtStr,
      'Thời gian khắc phục': resolvedAtStr,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã sự cố
    { wch: 16 }, // Mức độ
    { wch: 18 }, // Trạng thái
    { wch: 25 }, // Phòng máy
    { wch: 16 }, // Mã máy tính
    { wch: 45 }, // Mô tả sự cố
    { wch: 24 }, // Người báo cáo
    { wch: 24 }, // KTV phụ trách
    { wch: 22 }, // Thời gian báo cáo
    { wch: 22 }, // Thời gian khắc phục
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BaoCaoSuCo');

  XLSX.writeFile(workbook, filename);
};

// ==========================================
// LỊCH THỰC HÀNH / ĐẶT PHÒNG (SCHEDULE / BOOKING) EXCEL PARSER & EXPORTER
// ==========================================

export const DEFAULT_PERIOD_MAP: Record<number, { startTime: string; endTime: string }> = {
  1: { startTime: '07:00', endTime: '07:45' },
  2: { startTime: '07:50', endTime: '08:35' },
  3: { startTime: '08:40', endTime: '09:25' },
  4: { startTime: '09:30', endTime: '10:15' },
  5: { startTime: '10:20', endTime: '11:05' },
  6: { startTime: '13:00', endTime: '13:45' },
  7: { startTime: '13:50', endTime: '14:35' },
  8: { startTime: '14:40', endTime: '15:25' },
  9: { startTime: '15:30', endTime: '16:15' },
  10: { startTime: '16:20', endTime: '17:05' },
  11: { startTime: '17:15', endTime: '18:00' },
  12: { startTime: '18:05', endTime: '18:50' },
};

/**
 * Hàm phân tích ngày từ Excel (hỗ trợ số serial Excel, DD-MM-YY, DD/MM/YYYY, YYYY-MM-DD)
 */
export const parseScheduleDate = (val: any): string | null => {
  if (val === undefined || val === null || val === '') return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // Xử lý chuỗi ngày ngăn cách bởi -, / hoặc .
  const parts = str.split(/[-/.]/);
  if (parts.length === 3) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);

    // Trường hợp YYYY-MM-DD
    if (d > 1000) {
      const temp = d;
      d = y;
      y = temp;
    }

    if (y < 100) y += 2000;

    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
};

/**
 * Tính toán giờ bắt đầu và giờ kết thúc dựa trên tiết bắt đầu và số tiết
 */
export const getPeriodTimes = (
  startPeriod: number,
  periodCount: number,
  existingSlots: TimeSlot[] = []
): { startTimeStr: string; endTimeStr: string; timeRangeDisplay: string; endPeriod: number } => {
  const pCount = Math.max(1, periodCount || 1);
  const endPeriod = startPeriod + pCount - 1;

  // Tìm trong danh sách TimeSlot của hệ thống
  const findSlot = (p: number) => {
    return existingSlots.find((s) => {
      const cleanName = cleanString(s.slotName);
      return (
        cleanName === `tiet ${p}` ||
        cleanName === `tiet${p}` ||
        cleanName === String(p) ||
        cleanName.includes(`tiet ${p}`)
      );
    });
  };

  const startSlot = findSlot(startPeriod);
  const endSlot = findSlot(endPeriod);

  let startH = startSlot?.startTime ? startSlot.startTime.substring(0, 5) : DEFAULT_PERIOD_MAP[startPeriod]?.startTime || '07:00';
  let endH = endSlot?.endTime ? endSlot.endTime.substring(0, 5) : DEFAULT_PERIOD_MAP[endPeriod]?.endTime || '11:05';

  if (!startH.includes(':')) startH = '07:00';
  if (!endH.includes(':')) endH = '11:05';

  return {
    startTimeStr: `${startH}:00`,
    endTimeStr: `${endH}:00`,
    timeRangeDisplay: `${startH} - ${endH} (Tiết ${startPeriod}${pCount > 1 ? ` - ${endPeriod}` : ''})`,
    endPeriod,
  };
};

/**
 * Sinh danh sách tất cả các ngày định kỳ hàng tuần từ Ngày BĐ đến Ngày KT theo Thứ
 */
export const generateWeeklyDates = (
  startDateStr: string,
  endDateStr: string,
  dayOfWeek: number
): string[] => {
  const dates: string[] = [];
  try {
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);

    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [startDateStr];
    }

    // dayOfWeek: 2 (T2) -> 1, 3 (T3) -> 2, ..., 7 (T7) -> 6, 8 (CN) -> 0
    const targetJsDay = dayOfWeek === 8 ? 0 : dayOfWeek - 1;

    const current = new Date(start);
    // Nếu ngày bắt đầu chưa đúng thứ, nhảy tới ngày đúng thứ đầu tiên
    while (current.getDay() !== targetJsDay && current <= end) {
      current.setDate(current.getDate() + 1);
    }

    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 7); // Sang tuần kế tiếp
    }

    if (dates.length === 0) {
      dates.push(startDateStr);
    }
  } catch {
    return [startDateStr];
  }
  return dates;
};

const dayOfWeekNames: Record<number, string> = {
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
  8: 'Chủ Nhật',
};

export interface ParsedScheduleRow {
  key: string;
  stt: number;
  subjectCode: string;        // Mã HP
  credits?: number;           // Số TC
  subjectName: string;        // Lớp học phần
  cohort?: string;            // Khóa học (K65,...)
  expectedStudents?: number;  // Số SV dự kiến
  registeredStudents?: number;// Số SV đã ĐK
  studyType?: string;         // Hình thức học (TH/TN)
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  dayOfWeek: number;          // 2..8
  dayOfWeekText: string;      // "Thứ Ba"
  startPeriod: number;        // Tiết BĐ
  periodCount: number;        // Số tiết
  endPeriod: number;          // Tiết KT
  startTimeStr: string;       // HH:mm:ss
  endTimeStr: string;         // HH:mm:ss
  timeRangeDisplay: string;   // "07:50 - 09:25 (Tiết 2 - 3)"
  roomInput: string;          // Tên phòng trong file Excel
  matchedRoom?: Room;
  campus?: string;            // Cơ sở đào tạo (Cơ sở 1, Cơ sở 2)
  teacherInput: string;       // Tên giảng viên trong file Excel
  matchedUser?: User;
  faculty?: string;           // Khoa/Viện
  purpose: string;            // Mục đích đặt phòng
  generatedDates: string[];   // Các ngày sẽ được tạo lịch
  isValid: boolean;
  errorMessages: string[];
}

export const parseScheduleFromExcel = async (
  file: File,
  existingRooms: Room[] = [],
  existingUsers: User[] = [],
  existingTimeSlots: TimeSlot[] = [],
  autoRepeatWeekly = true
): Promise<ParsedScheduleRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File Excel không có sheet dữ liệu nào');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsedRows: ParsedScheduleRow[] = [];

        rawRows.forEach((row, index) => {
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[cleanString(key)] = row[key];
          });

          // Lấy các trường thông tin theo header chuẩn của TKB Thực hành
          const sttRaw = getRowValue(normalizedRow, ['tt', 'stt', 'so thu tu', 'sothutu', 'no']);
          const subjectCode = getRowValue(normalizedRow, ['ma hp', 'mahp', 'ma hoc phan', 'mahocphan', 'subjectcode', 'code']);
          const creditsRaw = getRowValue(normalizedRow, ['so tc', 'sotc', 'tin chi', 'tinchi', 'credits']);
          const subjectName = getRowValue(normalizedRow, [
            'lop hoc phan',
            'lophocphan',
            'ten hoc phan',
            'tenhocphan',
            'lop hp',
            'lophp',
            'mon hoc',
            'ten mon',
            'subjectname',
            'classname',
          ]);
          const cohort = getRowValue(normalizedRow, ['khoa hoc', 'khoahoc', 'khoa', 'cohort']);
          const expSvRaw = getRowValue(normalizedRow, ['so sv du kien', 'sosvdukien', 'sv du kien']);
          const regSvRaw = getRowValue(normalizedRow, ['so sv da dk', 'sosvdadk', 'sv da dk', 'da dk']);
          const studyType = getRowValue(normalizedRow, ['hinh thuc hoc', 'hinhthuchoc', 'hinh thuc', 'type']) || 'TH/TN';

          const startDateRaw = getRowValue(normalizedRow, ['ngay bd', 'ngaybd', 'ngay bat dau', 'ngaybatdau', 'startdate', 'start']);
          const endDateRaw = getRowValue(normalizedRow, ['ngay kt', 'ngaykt', 'ngay ket thuc', 'ngayketthuc', 'enddate', 'end']);

          const dayOfWeekRaw = getRowValue(normalizedRow, ['thu', 'thu trong tuan', 'thutrongtuan', 'dayofweek', 'day']);
          const startPeriodRaw = getRowValue(normalizedRow, ['tiet bd', 'tietbd', 'tiet bat dau', 'tietbatdau', 'startperiod', 'period']);
          const periodCountRaw = getRowValue(normalizedRow, ['so tiet', 'sotiet', 'so tiet/tuan', 'sotiet/tuan', 'tiet', 'periodcount', 'duration']);

          const roomInput = getRowValue(normalizedRow, ['phong hoc', 'phonghoc', 'phong', 'phong may', 'phongmay', 'room', 'roomname']);
          const campus = getRowValue(normalizedRow, ['co so dao tao', 'cosodaotao', 'co so', 'coso', 'campus']);
          const teacherInput = getRowValue(normalizedRow, ['giao vien', 'giaovien', 'giang vien', 'giangvien', 'teacher', 'gv']);
          const faculty = getRowValue(normalizedRow, ['khoa/vien', 'khoavien', 'khoa', 'vien', 'faculty', 'department']);

          // Kiểm tra nếu dòng hoàn toàn trống
          if (!subjectCode && !subjectName && !roomInput && !teacherInput && !startDateRaw) {
            return;
          }

          const stt = parseInt(sttRaw, 10) || index + 1;
          const credits = parseInt(creditsRaw, 10) || undefined;
          const expectedStudents = parseInt(expSvRaw, 10) || undefined;
          const registeredStudents = parseInt(regSvRaw, 10) || undefined;

          // Parse ngày
          const startDate = parseScheduleDate(startDateRaw);
          const endDate = parseScheduleDate(endDateRaw) || startDate;

          // Parse thứ (2: Thứ 2 ... 8: Chủ nhật)
          let dayOfWeek = parseInt(dayOfWeekRaw, 10);
          if (isNaN(dayOfWeek)) {
            const cleanThu = cleanString(dayOfWeekRaw);
            if (cleanThu.includes('hai') || cleanThu === 't2' || cleanThu === '2') dayOfWeek = 2;
            else if (cleanThu.includes('ba') || cleanThu === 't3' || cleanThu === '3') dayOfWeek = 3;
            else if (cleanThu.includes('tu') || cleanThu === 't4' || cleanThu === '4') dayOfWeek = 4;
            else if (cleanThu.includes('nam') || cleanThu === 't5' || cleanThu === '5') dayOfWeek = 5;
            else if (cleanThu.includes('sau') || cleanThu === 't6' || cleanThu === '6') dayOfWeek = 6;
            else if (cleanThu.includes('bay') || cleanThu === 't7' || cleanThu === '7') dayOfWeek = 7;
            else if (cleanThu.includes('nhat') || cleanThu === 'cn' || cleanThu === '8') dayOfWeek = 8;
            else dayOfWeek = 2;
          }
          if (dayOfWeek < 2 || dayOfWeek > 8) dayOfWeek = 2;

          // Parse tiết
          let startPeriod = parseInt(startPeriodRaw, 10);
          if (isNaN(startPeriod) || startPeriod <= 0) startPeriod = 1;
          let periodCount = parseInt(periodCountRaw, 10);
          if (isNaN(periodCount) || periodCount <= 0) periodCount = 2;

          // Tính toán thời gian
          const { startTimeStr, endTimeStr, timeRangeDisplay, endPeriod } = getPeriodTimes(
            startPeriod,
            periodCount,
            existingTimeSlots
          );

          // Khớp phòng máy thông minh (hỗ trợ tên phòng, mã phòng, mã máy tính, tiền tố mã phòng)
          let matchedRoom: Room | undefined = undefined;
          if (roomInput) {
            const cleanRoomInput = cleanString(roomInput);
            const pureRoomInput = cleanRoomInput.replace(/[^a-z0-9]/g, '');

            // Trích xuất tiền tố phòng nếu giá trị là mã máy tính (ví dụ: LAB2-PC031 -> LAB2)
            const roomPrefix = cleanRoomInput.split(/[-_.]?pc/i)[0].replace(/[-_.]/g, '');

            matchedRoom = existingRooms.find((r) => {
              const cName = cleanString(r.roomName);
              const cCode = cleanString(r.roomCode);
              const pName = cName.replace(/[^a-z0-9]/g, '');
              const pCode = cCode.replace(/[^a-z0-9]/g, '');

              // 1. Khớp chính xác hoặc khớp chuỗi đã làm sạch
              if (
                cName === cleanRoomInput ||
                cCode === cleanRoomInput ||
                pName === pureRoomInput ||
                pCode === pureRoomInput ||
                String(r.id) === cleanRoomInput
              ) {
                return true;
              }

              // 2. Kiểm tra nếu trong phòng có chứa máy tính trùng với mã được nhập
              if (r.computers && Array.isArray(r.computers)) {
                const hasComp = r.computers.some((comp) => {
                  const compCode = cleanString(comp.computerCode);
                  const pComp = compCode.replace(/[^a-z0-9]/g, '');
                  return compCode === cleanRoomInput || pComp === pureRoomInput;
                });
                if (hasComp) return true;
              }

              // 3. Khớp theo tiền tố phòng trích xuất từ mã máy tính
              if (roomPrefix && roomPrefix.length >= 2) {
                if (pCode === roomPrefix || pName.includes(roomPrefix) || roomPrefix.includes(pCode)) {
                  return true;
                }
              }

              // 4. Khớp chứa chuỗi (với chuỗi đủ độ dài)
              if (pCode.length >= 3 && (pureRoomInput.includes(pCode) || pCode.includes(pureRoomInput))) {
                return true;
              }
              if (pName.length >= 4 && (pureRoomInput.includes(pName) || pName.includes(pureRoomInput))) {
                return true;
              }

              return false;
            });
          }

          // Khớp giảng viên
          let matchedUser: User | undefined = undefined;
          if (teacherInput) {
            const cleanTeacher = cleanString(teacherInput);
            matchedUser = existingUsers.find((u) => {
              const cName = cleanString(u.fullName);
              const cUser = cleanString(u.username);
              return cName === cleanTeacher || cUser === cleanTeacher || cName.includes(cleanTeacher);
            });
          }

          // Sinh danh sách ngày đặt phòng
          const generatedDates = (startDate && endDate && autoRepeatWeekly)
            ? generateWeeklyDates(startDate, endDate, dayOfWeek)
            : (startDate ? [startDate] : []);

          // Xây dựng mục đích đặt phòng rõ ràng, chi tiết
          const purposeParts: string[] = [];
          if (subjectCode && subjectName) {
            purposeParts.push(`[${subjectCode}] ${subjectName}`);
          } else if (subjectName) {
            purposeParts.push(subjectName);
          } else if (subjectCode) {
            purposeParts.push(`Môn học: ${subjectCode}`);
          } else {
            purposeParts.push('Thực hành phòng máy');
          }

          if (teacherInput) purposeParts.push(`GV: ${teacherInput}`);
          if (cohort) purposeParts.push(`Khóa: ${cohort}`);
          if (registeredStudents) purposeParts.push(`Sĩ số: ${registeredStudents} SV`);

          const purpose = purposeParts.join(' | ');

          // Validate dữ liệu dòng
          const errorMessages: string[] = [];
          if (!subjectName && !subjectCode) {
            errorMessages.push('Thiếu mã/tên lớp học phần');
          }
          if (!startDate) {
            errorMessages.push('Ngày bắt đầu không hợp lệ');
          }
          if (!roomInput) {
            errorMessages.push('Thiếu thông tin phòng học');
          } else if (!matchedRoom) {
            errorMessages.push(`Phòng "${roomInput}" chưa có trong hệ thống`);
          }

          parsedRows.push({
            key: `schedule-row-${index}`,
            stt,
            subjectCode,
            credits,
            subjectName: subjectName || subjectCode || `Lớp học phần #${stt}`,
            cohort,
            expectedStudents,
            registeredStudents,
            studyType,
            startDate: startDate || '',
            endDate: endDate || '',
            dayOfWeek,
            dayOfWeekText: dayOfWeekNames[dayOfWeek] || `Thứ ${dayOfWeek}`,
            startPeriod,
            periodCount,
            endPeriod,
            startTimeStr,
            endTimeStr,
            timeRangeDisplay,
            roomInput,
            matchedRoom,
            campus,
            teacherInput,
            matchedUser,
            faculty,
            purpose,
            generatedDates,
            isValid: errorMessages.length === 0,
            errorMessages,
          });
        });

        resolve(parsedRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Tải file Excel mẫu theo đúng định dạng "TKB Thực hành.xlsx" của Nhà trường
 */
export const downloadSampleScheduleExcel = () => {
  const headers = [
    'TT',
    'Mã HP',
    'Số TC',
    'Lớp học phần',
    'Khóa học',
    'Số SV dự kiến',
    'Số SV đã ĐK',
    'Hình thức học',
    'Ngày BĐ',
    'Ngày KT',
    'Số tiết /tuần',
    'Thứ',
    'Tiết BĐ',
    'Số tiết',
    'Phòng học',
    'Cơ sở đào tạo',
    'Giáo Viên',
    'Khoa/Viện',
  ];

  const sampleData = [
    [
      1,
      'INF20005',
      4,
      'Ứng dụng ICT trong giáo dục(225.2)_DAMH_01_CS2_TH_01',
      'K65',
      17,
      17,
      'TH/TN',
      '20-01-26',
      '19-05-26',
      3,
      3,
      2,
      2,
      'PM_01_CS2',
      'Cơ sở 2',
      'Nguyễn Công Nhật',
      'Tin học',
    ],
    [
      2,
      'INF20005',
      4,
      'Ứng dụng ICT trong giáo dục(225.2)_DAMH_01_CS2_TH_02',
      'K65',
      17,
      17,
      'TH/TN',
      '20-01-26',
      '19-05-26',
      3,
      3,
      4,
      2,
      'PM_01_CS2',
      'Cơ sở 2',
      'Nguyễn Công Nhật',
      'Tin học',
    ],
    [
      3,
      'INF20005',
      4,
      'Ứng dụng ICT trong giáo dục(225.2)_DAMH_02_TH_03',
      'K65',
      18,
      16,
      'TH/TN',
      '20-01-26',
      '19-05-26',
      3,
      3,
      9,
      2,
      'TTKT. 602',
      'Cơ sở 1',
      'Nguyễn Công Nhật',
      'Tin học',
    ],
    [
      4,
      'INF20005',
      4,
      'Ứng dụng ICT trong giáo dục(225.2)_DAMH_03_TH_07',
      'K65',
      18,
      18,
      'TH/TN',
      '22-01-26',
      '21-05-26',
      3,
      5,
      1,
      2,
      'TTKT. 608',
      'Cơ sở 1',
      'Phan Lê Na',
      'Tin học',
    ],
    [
      5,
      'INF20005',
      4,
      'Ứng dụng ICT trong giáo dục(225.2)_DAMH_04_TH_11',
      'K65',
      18,
      19,
      'TH/TN',
      '20-01-26',
      '19-05-26',
      3,
      3,
      2,
      2,
      'TTKT. 603',
      'Cơ sở 1',
      'Nguyễn Bùi Hậu',
      'Tin học',
    ],
  ];

  const wsData = [headers, ...sampleData];
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  worksheet['!cols'] = [
    { wch: 6 },  // TT
    { wch: 12 }, // Mã HP
    { wch: 8 },  // Số TC
    { wch: 45 }, // Lớp học phần
    { wch: 10 }, // Khóa học
    { wch: 14 }, // Số SV dự kiến
    { wch: 14 }, // Số SV đã ĐK
    { wch: 14 }, // Hình thức học
    { wch: 12 }, // Ngày BĐ
    { wch: 12 }, // Ngày KT
    { wch: 14 }, // Số tiết /tuần
    { wch: 8 },  // Thứ
    { wch: 10 }, // Tiết BĐ
    { wch: 10 }, // Số tiết
    { wch: 15 }, // Phòng học
    { wch: 14 }, // Cơ sở đào tạo
    { wch: 22 }, // Giáo Viên
    { wch: 16 }, // Khoa/Viện
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'TKB_Thuc_Hanh');

  XLSX.writeFile(workbook, 'Mau_TKB_Thuc_Hanh.xlsx');
};

/**
 * Xuất danh sách đặt phòng ra file Excel
 */
export const exportBookingsToExcel = (
  bookings: Booking[],
  rooms: Room[] = [],
  filename = 'Danh_Sach_Dat_Phong_May.xlsx'
) => {
  const statusLabelMap: Record<BookingStatus, string> = {
    APPROVED: 'Đã duyệt',
    PENDING: 'Chờ duyệt',
    REJECTED: 'Từ chối',
    CANCELLED: 'Đã hủy',
    RETURNED: 'Đã trả phòng',
  };

  const roomMap = new Map<number, string>();
  rooms.forEach((r) => roomMap.set(r.id, r.roomName));

  const exportData = bookings.map((b, index) => {
    const roomName = (b.roomId ? roomMap.get(b.roomId) : undefined) || b.room?.roomName || b.roomName || 'Phòng máy';
    const userName = b.user?.fullName || b.userName || 'Giảng viên';

    const dateStr = b.bookingDate || (b.startTime?.includes('T') ? b.startTime.split('T')[0] : b.startTime) || '';
    const startStr = b.startTime?.includes('T') ? b.startTime.split('T')[1]?.substring(0, 5) : b.startTime?.substring(0, 5) || '';
    const endStr = b.endTime?.includes('T') ? b.endTime.split('T')[1]?.substring(0, 5) : b.endTime?.substring(0, 5) || '';

    return {
      STT: index + 1,
      'Mã đặt phòng': `#${b.id}`,
      'Phòng máy': roomName,
      'Người mượn': userName,
      'Ngày đặt': dateStr,
      'Giờ bắt đầu': startStr,
      'Giờ kết thúc': endStr,
      'Khung giờ': `${startStr} - ${endStr}`,
      'Mục đích mượn': b.purpose || 'Dạy thực hành',
      'Trạng thái': statusLabelMap[b.status] || b.status,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã đặt phòng
    { wch: 22 }, // Phòng máy
    { wch: 24 }, // Người mượn
    { wch: 14 }, // Ngày đặt
    { wch: 12 }, // Giờ BĐ
    { wch: 12 }, // Giờ KT
    { wch: 16 }, // Khung giờ
    { wch: 45 }, // Mục đích
    { wch: 15 }, // Trạng thái
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachDatPhong');

  XLSX.writeFile(workbook, filename);
};


