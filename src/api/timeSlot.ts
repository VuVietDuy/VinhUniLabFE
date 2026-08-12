import type { PageResponse } from "../type/PageResponse";
import axiosClient from "./axiosClient";

export interface TimeSlot {
  id: number;
  slotName: string;
  startTime: string; // ISO time string or "HH:mm" / "HH:mm:ss", e.g., "07:00"
  endTime: string;   // ISO time string or "HH:mm" / "HH:mm:ss", e.g., "07:45"
}

export const timeSlotApi = {
  getAll: () => axiosClient.get<TimeSlot[]>('/time-slots/findAll'),
  search: (params?: any) => axiosClient.get<PageResponse<TimeSlot>>('/time-slots/search', { params }),
  getById: (id: number) => axiosClient.get<TimeSlot>(`/time-slots/${id}`),
  create: (data: Partial<TimeSlot>) => axiosClient.post<TimeSlot>('/time-slots/create', data),
  update: (id: number, data: Partial<TimeSlot>) => axiosClient.put<TimeSlot>(`/time-slots/update?id=${id}`, data),
  delete: (id: number) => axiosClient.delete(`/time-slots/delete?id=${id}`),
};
