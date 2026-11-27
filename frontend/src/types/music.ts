export interface MusicFileDto {
  id: number;
  fileName: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  year: number | null;
  genre: string | null;
  trackNumber: number | null;
  durationMs: number | null;
  fileSize: number;
  hasArtwork: boolean;
  artworkUrl?: string | null;
  lyrics?: string | null;
  playCount?: number;
  lastPlayedAt?: string | null;
  tagSyncStatus?: 'SYNCED' | 'SYNCING' | 'FAILED';
  createdAt: string;
}

export interface DirectUploadInitRequest {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadInitResult {
  storageKey: string;
  uploadUrl: string;
}

export interface DirectUploadCompleteRequest {
  storageKey: string;
  fileName: string;
}

export interface PlayUrlResult {
  playUrl: string;
  durationMs: number | null;
}

export interface DownloadUrlResult {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
}

export interface BatchDownloadTicketResponse {
  ticket: string;
  downloadUrl: string;
  totalCount: number;
  totalBytes: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
