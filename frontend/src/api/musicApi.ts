import axios from 'axios';
import { apiClient } from './client';
import type {
  DirectUploadCompleteRequest,
  DirectUploadInitRequest,
  DownloadUrlResult,
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
    sort: string = 'title,asc',
  ): Promise<Page<MusicFileDto>> {
    const response = await apiClient.get<Page<MusicFileDto>>('/music-files', {
      params: { page, size, sort },
    });
    return response.data;
  },

  async getMusicFile(id: number): Promise<MusicFileDto> {
    const response = await apiClient.get<MusicFileDto>(`/music-files/${id}`);
    return response.data;
  },

  async getPlayUrl(id: number): Promise<PlayUrlResult> {
    const response = await apiClient.get<PlayUrlResult>(`/music-files/${id}/play`);
    return response.data;
  },

  async getDownloadUrl(id: number): Promise<DownloadUrlResult> {
    const response = await apiClient.get<DownloadUrlResult>(`/music-files/${id}/download`);
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

  async updateMetadata(id: number, request: UpdateMusicMetadataDto): Promise<MusicFileDto> {
    const response = await apiClient.patch<MusicFileDto>(`/music-files/${id}`, request);
    return response.data;
  },

  async getSyncStatus(
    id: number,
  ): Promise<{ id: number; status: 'SYNCED' | 'SYNCING' | 'FAILED' }> {
    const response = await apiClient.get<{ id: number; status: 'SYNCED' | 'SYNCING' | 'FAILED' }>(
      `/music-files/${id}/sync-status`,
    );
    return response.data;
  },

  async resyncTags(id: number): Promise<{ id: number; status: 'SYNCED' | 'SYNCING' | 'FAILED' }> {
    const response = await apiClient.post<{ id: number; status: 'SYNCED' | 'SYNCING' | 'FAILED' }>(
      `/music-files/${id}/resync-tags`,
    );
    return response.data;
  },

  async getMetadataSuggestions(artist?: string): Promise<MetadataSuggestionsDto> {
    const response = await apiClient.get<MetadataSuggestionsDto>('/music-files/metadata-suggestions', {
      params: { artist: artist?.trim() || undefined },
    });
    return response.data;
  },
};

export interface MetadataSuggestionsDto {
  artists: string[];
  albums: string[];
}

export interface UpdateMusicMetadataDto {
  title?: string;
  artist?: string;
  album?: string;
  year?: number | null;
  genre?: string;
  trackNumber?: number | null;
  lyrics?: string;
}
