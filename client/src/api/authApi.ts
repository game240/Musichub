import { apiClient } from './client';
import type { AuthResponse, GoogleLoginRequest } from '../types/auth';

export const authApi = {
  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const payload: GoogleLoginRequest = { idToken };
    const response = await apiClient.post<AuthResponse>('/auth/google', payload);
    return response.data;
  },

  async refresh(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/refresh');
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
