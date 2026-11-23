import { apiClient } from './client';
import type { UserRole } from '../types/auth';

export interface AdminUserDto {
  id: number;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  authProvider: string;
  role: UserRole;
  storageUsedBytes: number;
  trackCount: number;
  createdAt: string;
}

export interface AdminUsersPageResponse {
  content: AdminUserDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const adminApi = {
  async listUsers(query?: string, page = 0, size = 20): Promise<AdminUsersPageResponse> {
    const params: Record<string, string | number> = { page, size };
    if (query && query.trim()) {
      params.query = query.trim();
    }
    const response = await apiClient.get<AdminUsersPageResponse>('/admin/users', { params });
    return response.data;
  },

  async updateUserRole(userId: number, role: UserRole): Promise<AdminUserDto> {
    const response = await apiClient.patch<AdminUserDto>(`/admin/users/${userId}/role`, {
      role,
    });
    return response.data;
  },
};
