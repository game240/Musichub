import React from 'react';
import type { MusicFileDto } from '../../../../types/music';
import { TrackRow } from './TrackRow';
import { EmptyState } from '../../../molecules/EmptyState';

export interface TrackTableProps {
  tracks: MusicFileDto[];
  currentTrackId?: number;
  isPlaying: boolean;
  onPlay: (track: MusicFileDto) => void;
  onAddToQueue: (track: MusicFileDto) => void;
  onDelete: (track: MusicFileDto) => void;
  onUploadClick: () => void;
  isFiltered?: boolean;
}

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlay,
  onAddToQueue,
  onDelete,
  onUploadClick,
  isFiltered = false,
}) => {
  if (tracks.length === 0) {
    if (isFiltered) {
      return (
        <EmptyState
          title="No tracks found"
          description="Try adjusting your search query to find your music."
        />
      );
    }
    return (
      <EmptyState
        title="Your locker is empty"
        description="Upload your personal MP3, FLAC, or M4A audio files to get started."
        actionLabel="Upload Audio Files"
        onAction={onUploadClick}
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/80">
            <th className="py-3 px-4 w-12 text-center">#</th>
            <th className="py-3 px-4">Title / Artist</th>
            <th className="py-3 px-4 hidden md:table-cell">Album</th>
            <th className="py-3 px-4 hidden sm:table-cell">Time</th>
            <th className="py-3 px-4 hidden lg:table-cell">Size</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              isCurrent={track.id === currentTrackId}
              isPlaying={isPlaying}
              onPlay={onPlay}
              onAddToQueue={onAddToQueue}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
