import type { MusicFileDto } from './music';

export interface PlaybackStateDto {
  currentTrack: MusicFileDto | null;
  queue: MusicFileDto[];
  shuffledQueue: MusicFileDto[];
  queueIndex: number;
  isShuffle: boolean;
  repeatMode: 'OFF' | 'ALL' | 'ONE';
  currentPositionMs: number;
}

export interface UpdatePlaybackStateRequest {
  currentTrackId: number | null;
  queueTrackIds: number[];
  shuffledTrackIds: number[];
  queueIndex: number;
  isShuffle: boolean;
  repeatMode: string;
  currentPositionMs: number;
}
