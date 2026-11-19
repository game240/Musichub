import axios from 'axios';
import { apiClient } from './client';
import type {
  DirectUploadCompleteRequest,
  DirectUploadInitRequest,
  MusicFileDto,
  Page,
  PlayUrlResult,
  UploadInitResult,
} from '../types/music';

export const musicApi = {
  async initDirectUpload(request: DirectUploadInitRequest): Promise<UploadInitResult> {
    const response = await apiClient.post<UploadInitResult>('/music-files/upload/init', request);
    return response.data;
  },

  async uploadToR2(
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    // Direct PUT to Cloudflare R2 requires sending the raw file with matching mime type and NO custom auth headers
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },

  async completeDirectUpload(request: DirectUploadCompleteRequest): Promise<MusicFileDto> {
    const response = await apiClient.post<MusicFileDto>('/music-files/upload/complete', request);
    return response.data;
  },

  async uploadViaProxy(file: File, onProgress?: (percent: number) => void): Promise<MusicFileDto> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<MusicFileDto>('/music-files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  },

  async listMusicFiles(
    page: number = 0,
    size: number = 50,
    sort: string = 'createdAt,desc',
  ): Promise<Page<MusicFileDto>> {
    const response = await apiClient.get<Page<MusicFileDto>>('/music-files', {
      params: { page, size, sort },
    });
    return response.data;
  },

  async getPlayUrl(id: number): Promise<PlayUrlResult> {
    const response = await apiClient.get<PlayUrlResult>(`/music-files/${id}/play`);
    return response.data;
  },

  async getArtworkUrl(id: number): Promise<string | null> {
    const response = await apiClient.get<{ artworkUrl: string | null }>(
      `/music-files/${id}/artwork`,
    );
    return response.data.artworkUrl;
  },

  async deleteMusicFile(id: number): Promise<void> {
    await apiClient.delete(`/music-files/${id}`);
  },

  async updateMetadata(
    id: number,
    request: UpdateMusicMetadataDto,
  ): Promise<MusicFileDto> {
    const response = await apiClient.patch<MusicFileDto>(`/music-files/${id}`, request);
    return response.data;
  },
};

export interface UpdateMusicMetadataDto {
  title?: string;
  artist?: string;
  album?: string;
  year?: number | null;
  genre?: string;
  trackNumber?: number | null;
  lyrics?: string;
}
