import { apiClient } from './client';
import type { PlaybackStateDto, UpdatePlaybackStateRequest } from '../types/playback';

export const playbackApi = {
  async getPlaybackState(): Promise<PlaybackStateDto> {
    const response = await apiClient.get<PlaybackStateDto>('/users/me/playback');
    return response.data;
  },

  async updatePlaybackState(data: UpdatePlaybackStateRequest): Promise<void> {
    await apiClient.put('/users/me/playback', data);
  },
};
