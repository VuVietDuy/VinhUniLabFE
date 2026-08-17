import type { PageResponse } from '../type/PageResponse';
import axiosClient from './axiosClient';
import type { Room } from './room';
import type { User } from './user';

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'RETURNED';

export interface Booking {
  id: number;
  roomId: number;
  roomName?: string;
  userId: number;
  userName?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: BookingStatus;
  createdAt: string;
  user: User;
  room: Room;
}

export const bookingApi = {
  getAll: () => axiosClient.get<Booking[]>('/bookings/findAll'),
  search: (params?: any) => axiosClient.get<PageResponse<Booking>>('/bookings/search', { params }),
  getRecent: () => axiosClient.get<PageResponse<Booking>>('/bookings/recent'),
  getMine: () => axiosClient.get<Booking[]>('/bookings/mine'),
  create: (data: Partial<Booking>) => axiosClient.post<Booking>('/bookings/create', data),
  approve: (id: number) => axiosClient.put(`/bookings/approve`, null, { params: { id } }),
  reject: (id: number) => axiosClient.put(`/bookings/reject`, null, { params: { id } }),
  cancel: (id: number) => axiosClient.put(`/bookings/cancel`, null, { params: { id } }),
  returnRoom: (id: number) => axiosClient.put(`/bookings/return`, null, { params: { id } }),
  delete: (id: number) => axiosClient.delete(`/bookings/delete`, { params: { id } }),
  getMyBookings: (params: { page: number, size: number, status?: string }) =>
    axiosClient.get<PageResponse<Booking>>('/bookings/mine', { params }),

};