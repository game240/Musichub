import { apiClient } from './client';
import type {
  AuthResponse,
  GoogleLoginRequest,
  LocalLoginRequest,
  LocalRegisterRequest,
} from '../types/auth';

export const authApi = {
  async loginWithLocal(data: LocalLoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  async requestSignupCode(email: string): Promise<void> {
    await apiClient.post('/auth/signup/request-code', { email });
  },

  async register(data: LocalRegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

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
