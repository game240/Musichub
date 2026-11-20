import { apiClient, getAccessToken } from './client';
import type {
  UserIdentitiesResponse,
  SetPasswordRequest,
  AuthProviderType,
} from '../types/auth';

export interface VolumeResponse {
  volume: number;
}

export const userApi = {
  async updateVolume(volumePercent: number): Promise<VolumeResponse> {
    const response = await apiClient.patch<VolumeResponse>('/users/me/volume', {
      volume: volumePercent,
    });
    return response.data;
  },

  async getIdentities(): Promise<UserIdentitiesResponse> {
    const response = await apiClient.get<UserIdentitiesResponse>('/users/me/identities');
    return response.data;
  },

  async setPassword(data: SetPasswordRequest): Promise<void> {
    await apiClient.post('/users/me/identities/password', data);
  },

  async linkGoogle(idToken: string): Promise<void> {
    await apiClient.post('/users/me/identities/google', { idToken });
  },

  async unlinkProvider(provider: AuthProviderType): Promise<void> {
    await apiClient.delete(`/users/me/identities/${provider}`);
  },

  isLoggedIn(): boolean {
    return !!getAccessToken();
  },
};
