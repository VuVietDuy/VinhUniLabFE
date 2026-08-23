import * as XLSX from 'xlsx';
import type { Room } from '../api/room';
import type { Computer, ComputerStatus } from '../api/computer';
import type { User, UserRole } from '../api/user';
import type { Incident, IncidentStatus, Priority } from '../api/incident';

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

