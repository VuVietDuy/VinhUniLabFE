import type { PageResponse } from "../type/PageResponse";
import axiosClient from "./axiosClient";
import type { Computer } from "./computer";

export interface Room {
  id: number;
  roomCode: string;
  roomName: string;
  location: string; // Khớp với DB: location thay vì building/floor
  totalSeats: number;
  isActive: boolean;
  computers: Computer[]; // Thêm trường này để chứa danh sách máy tính trong phòng
}

export const roomApi = {
  getAll: () => axiosClient.get<Room[]>('/admin/rooms/findAll'),
  search: (params?: any) => axiosClient.get<PageResponse<Room>>('/admin/rooms/search', { params }),
  getById: (id: number) => axiosClient.get<Room>(`/admin/rooms/update/${id}`),
  create: (data: Partial<Room>) => axiosClient.post<Room>('/admin/rooms/create', data),
  saveAll: (data: Partial<Room>[]) => axiosClient.post<Room[]>('/admin/rooms/saveAll', data),
  update: (id: number, data: Partial<Room>) => axiosClient.put<Room>(`/admin/rooms/update?id=${id}`, data),
  delete: (id: number) => axiosClient.delete(`/admin/rooms/delete?id=${id}`),
};
