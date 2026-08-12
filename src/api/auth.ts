import axiosClient from './axiosClient';
import axios from 'axios';
const API_URL = 'http://localhost:8080/api/auth';

export interface ChangePasswordPayload {
  currentPassword?: string;
  oldPassword?: string;
  newPassword: string;
  confirmPassword?: string;
}

export const authApi = {
  changePassword: (data: ChangePasswordPayload) =>
    axiosClient.post<{ success: boolean; message: string }>('/auth/change-password', data),
};

export const login = async (values: any) => {
  const response = await axios.post(`${API_URL}/login`, values);
  return response.data;
};