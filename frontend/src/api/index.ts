import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginParams {
  username: string;
  password: string;
}

export interface License {
  id: number;
  license_key: string;
  domain: string;
  remark: string;
  expire_time: number;
  status: number;
  created_time: number;
  updated_time: number;
}

export interface LicenseListResponse {
  list: License[];
}

export interface ImportResult {
  success: number;
  failed: number;
  errors?: string[];
}

export const authApi = {
  login: (data: LoginParams) =>
    api.post<{ token: string; username: string }>('/admin/login', data),
};

export const licenseApi = {
  list: (keyword?: string) =>
    api.post<LicenseListResponse>('/admin/license/list', { keyword }),
  create: (data: { domain: string; remark: string; expire_time: number; license_key?: string }) =>
    api.post<License>('/admin/license/create', data),
  update: (data: { id: number; domain: string; remark: string; expire_time: number; status: number; license_key?: string }) =>
    api.post('/admin/license/update', data),
  delete: (id: number) =>
    api.post('/admin/license/delete', { id }),
  export: () =>
    api.get('/admin/license/export', { responseType: 'blob' }),
  import: (file: File, overwrite: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('overwrite', overwrite.toString());
    return api.post<ImportResult>('/admin/license/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const adminApi = {
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/admin/change_password', data),
};

export default api;
