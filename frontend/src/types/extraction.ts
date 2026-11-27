export type ExtractionJobStatus =
  'PENDING' | 'DOWNLOADING' | 'CONVERTING' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ExtractionJobDto {
  id: number;
  sourceUrl: string;
  status: ExtractionJobStatus;
  attempts: number;
  errorMessage: string | null;
  musicFileId: number | null;
  musicFileTitle: string | null;
  musicFileArtist: string | null;
  musicFileDurationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ExtractionRequest {
  sourceUrl: string;
}
