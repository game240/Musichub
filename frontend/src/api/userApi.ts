import { apiClient, getAccessToken } from './client';

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

  isLoggedIn(): boolean {
    return !!getAccessToken();
  },
};
