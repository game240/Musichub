import React from 'react';
import { Play, Pause, Trash2, ListPlus } from 'lucide-react';
import type { MusicFileDto } from '../../../../types/music';
import { TrackArtwork } from './TrackArtwork';
import { formatDurationMs } from '../../../../utils/formatTime';
import { formatBytes } from '../../../../utils/formatBytes';
import { Tooltip } from '../../../atoms/Tooltip';
import { cn } from '../../../../utils/cn';

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
      className={cn(
        'group border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors duration-150 select-none',
        isCurrent && 'bg-[#5e6ad2]/10'
      )}
    >
      {/* Index & Play button */}
      <td className="w-14 py-2.5 px-3 text-center relative">
        {isCurrent && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#5e6ad2] rounded-r" />
        )}
        <div className="w-7 h-7 mx-auto relative flex items-center justify-center">
          <div className="group-hover:hidden flex items-center justify-center">
            {isCurrent && isPlaying ? (
              <div className="flex items-end justify-center gap-0.5 h-3.5 w-3.5">
                <span className="w-0.5 bg-[#8590ea] h-full animate-bounce" />
                <span className="w-0.5 bg-[#8590ea] h-2/3 animate-bounce [animation-delay:0.2s]" />
                <span className="w-0.5 bg-[#8590ea] h-4/5 animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : (
              <span
                className={cn(
                  'text-xs',
                  isCurrent ? 'text-[#8590ea] font-semibold' : 'text-neutral-500'
                )}
              >
                {index + 1}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onPlay(track);
            }}
            className="hidden group-hover:flex w-7 h-7 items-center justify-center text-white bg-[#5e6ad2] hover:bg-[#6f7cf4] rounded-full shadow-md cursor-pointer transition-colors"
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
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-3">
          <TrackArtwork
            trackId={track.id}
            hasArtwork={track.hasArtwork}
            title={track.title}
            size="md"
          />
          <div className="min-w-0 max-w-xs md:max-w-md">
            <p
              className={cn(
                'text-sm font-medium truncate',
                isCurrent ? 'text-[#8590ea] font-semibold' : 'text-neutral-100'
              )}
            >
              {track.title || track.fileName}
            </p>
            <p className="text-xs text-neutral-400 truncate">
              {track.artist || '알 수 없는 아티스트'}
            </p>
          </div>
        </div>
      </td>

      {/* Album */}
      <td className="py-2.5 px-4 hidden md:table-cell">
        <span className="text-xs text-neutral-400 truncate max-w-xs block">
          {track.album || '—'}
        </span>
      </td>

      {/* Duration */}
      <td className="py-2.5 px-4 text-xs text-neutral-400 hidden sm:table-cell">
        {formatDurationMs(track.durationMs)}
      </td>

      {/* File Size */}
      <td className="py-2.5 px-4 text-xs text-neutral-500 hidden lg:table-cell">
        {formatBytes(track.fileSize)}
      </td>

      {/* Actions */}
      <td className="w-24 py-2.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="재생목록에 추가" side="top">
            <button
              type="button"
              onClick={() => {
                onAddToQueue(track);
              }}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <ListPlus className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="음원 삭제" side="top">
            <button
              type="button"
              onClick={() => {
                onDelete(track);
              }}
              className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
};
