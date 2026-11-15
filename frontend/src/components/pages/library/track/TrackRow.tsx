import React from 'react';
import { Play, Pause, Trash2, ListPlus } from 'lucide-react';
import type { MusicFileDto } from '../../../../types/music';
import { TrackArtwork } from './TrackArtwork';
import { formatDurationMs } from '../../../../utils/formatTime';
import { formatBytes } from '../../../../utils/formatBytes';

export interface TrackRowProps {
  track: MusicFileDto;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: (track: MusicFileDto) => void;
  onAddToQueue: (track: MusicFileDto) => void;
  onDelete: (track: MusicFileDto) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  onAddToQueue,
  onDelete,
}) => {
  return (
    <tr
      onDoubleClick={() => {
        onPlay(track);
      }}
      className={`group border-b border-slate-800/60 hover:bg-slate-800/50 transition-colors select-none ${
        isCurrent ? 'bg-indigo-950/30' : ''
      }`}
    >
      {/* Index & Play button */}
      <td className="w-12 py-3 px-4 text-center">
        <div className="relative flex items-center justify-center">
          {isCurrent && isPlaying ? (
            <div className="flex items-end justify-center gap-0.5 h-4 w-4">
              <span className="w-1 bg-indigo-400 h-full animate-bounce" />
              <span className="w-1 bg-indigo-400 h-2/3 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 bg-indigo-400 h-4/5 animate-bounce [animation-delay:0.4s]" />
            </div>
          ) : (
            <span
              className={`text-xs font-mono group-hover:hidden ${
                isCurrent ? 'text-indigo-400 font-bold' : 'text-slate-500'
              }`}
            >
              {index + 1}
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              onPlay(track);
            }}
            className="hidden group-hover:flex items-center justify-center p-1 text-white bg-indigo-600 rounded-full hover:scale-110 transition-transform shadow-md"
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>
        </div>
      </td>

      {/* Artwork + Title & Artist */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <TrackArtwork
            trackId={track.id}
            hasArtwork={track.hasArtwork}
            title={track.title}
            size="md"
          />
          <div className="min-w-0 max-w-xs md:max-w-md">
            <p
              className={`text-sm font-medium truncate ${
                isCurrent ? 'text-indigo-400 font-semibold' : 'text-slate-100'
              }`}
            >
              {track.title || track.fileName}
            </p>
            <p className="text-xs text-slate-400 truncate">{track.artist || 'Unknown Artist'}</p>
          </div>
        </div>
      </td>

      {/* Album */}
      <td className="py-3 px-4 hidden md:table-cell">
        <span className="text-xs text-slate-400 truncate max-w-xs block">{track.album || '—'}</span>
      </td>

      {/* Duration */}
      <td className="py-3 px-4 text-xs font-mono text-slate-400 hidden sm:table-cell">
        {formatDurationMs(track.durationMs)}
      </td>

      {/* File Size */}
      <td className="py-3 px-4 text-xs font-mono text-slate-500 hidden lg:table-cell">
        {formatBytes(track.fileSize)}
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title="Add to queue"
            onClick={() => {
              onAddToQueue(track);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <ListPlus className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Delete track"
            onClick={() => {
              onDelete(track);
            }}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};
