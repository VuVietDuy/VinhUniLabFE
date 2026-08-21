import axiosClient from './axiosClient';

// Sử dụng Union Type thay vì Enum để tránh lỗi 'erasableSyntaxOnly'
export type UserRole = 'ADMIN' | 'TEACHER' | 'TECHNICIAN';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  password?: string; // Dùng khi tạo mới hoặc đổi mật khẩu
  createdAt?: string;
}

export const userApi = {
  getAll: () => axiosClient.get<User[]>('/admin/users'),
  search: (params: any) => axiosClient.get<{ content: User[]; totalElements: number }>('/admin/users/search', { params }),
  create: (data: Partial<User>) => axiosClient.post<User>('/admin/users', data),
  saveAll: (data: Partial<User>[]) => axiosClient.post<User[]>('/admin/users/saveAll', data),
  update: (id: number, data: Partial<User>) => axiosClient.put<User>(`/admin/users/${id}`, data),
  delete: (id: number) => axiosClient.delete(`/admin/users/${id}`),
};