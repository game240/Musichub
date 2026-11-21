import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Trash2, ListPlus, Pencil, Download, MoreVertical } from 'lucide-react';
import type { MusicFileDto } from '../../../../types/music';
import { TrackArtwork } from './TrackArtwork';
import { formatDurationMs } from '../../../../utils/formatTime';
import { formatBytes } from '../../../../utils/formatBytes';
import { Tooltip } from '../../../atoms/Tooltip';
import { Spinner } from '../../../atoms/Spinner';
import { cn } from '../../../../utils/cn';

export interface TrackRowProps {
  track: MusicFileDto;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isDownloading?: boolean;
  onPlay: (track: MusicFileDto) => void;
  onAddToQueue: (track: MusicFileDto) => void;
  onEdit: (track: MusicFileDto) => void;
  onDelete: (track: MusicFileDto) => void;
  onDownload: (track: MusicFileDto) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isCurrent,
  isPlaying,
  isDownloading = false,
  onPlay,
  onAddToQueue,
  onEdit,
  onDelete,
  onDownload,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isMobileMenuOpen]);

  return (
    <tr
      onDoubleClick={() => {
        onPlay(track);
      }}
      className={cn(
        'group border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors duration-150 select-none',
        isCurrent && 'bg-[#5e6ad2]/10',
      )}
    >
      {/* Index & Play button */}
      <td className="w-10 sm:w-14 py-2.5 px-1 sm:px-3 text-center relative">
        {isCurrent && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#5e6ad2] rounded-r" />
        )}
        <div className="w-7 h-7 mx-auto relative flex items-center justify-center">
          {/* Desktop track number or equalizer */}
          <div className="hidden sm:flex group-hover:hidden items-center justify-center">
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
                  isCurrent ? 'text-[#8590ea] font-semibold' : 'text-neutral-500',
                )}
              >
                {index + 1}
              </span>
            )}
          </div>

          {/* Play/Pause Button: always visible on mobile, hover-only on desktop */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(track);
            }}
            aria-label={isCurrent && isPlaying ? '일시정지' : '재생'}
            className={cn(
              'w-7 h-7 items-center justify-center rounded-full shadow-md cursor-pointer transition-colors',
              'flex sm:hidden sm:group-hover:flex',
              isCurrent
                ? 'text-white bg-[#5e6ad2] hover:bg-[#6f7cf4]'
                : 'text-neutral-300 bg-white/[0.08] hover:bg-white/[0.15] sm:bg-[#5e6ad2] sm:text-white sm:hover:bg-[#6f7cf4]',
            )}
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
      <td className="py-2.5 px-2 sm:px-4">
        <div
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer"
          onClick={() => {
            onPlay(track);
          }}
        >
          <TrackArtwork
            trackId={track.id}
            hasArtwork={track.hasArtwork}
            title={track.title}
            size="md"
          />
          <div className="min-w-0 max-w-[190px] sm:max-w-xs md:max-w-md">
            <p
              className={cn(
                'text-sm font-medium truncate',
                isCurrent ? 'text-[#8590ea] font-semibold' : 'text-neutral-100',
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
      <td className="w-14 sm:w-36 py-2.5 px-3 sm:px-4 text-center sm:text-right relative">
        {/* Desktop actions (>= sm) */}
        <div className="hidden sm:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="음원 다운로드" side="top">
            <button
              type="button"
              onClick={() => {
                onDownload(track);
              }}
              disabled={isDownloading}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Spinner size="sm" className="w-4 h-4 text-[#8590ea]" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          </Tooltip>
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
          <Tooltip content="정보 수정" side="top">
            <button
              type="button"
              onClick={() => {
                onEdit(track);
              }}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
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

        {/* Mobile action trigger (< sm) */}
        <div className="sm:hidden flex items-center justify-center sm:justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen((prev) => !prev);
            }}
            aria-label="음원 메뉴 열기"
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {isMobileMenuOpen && (
          <div
            ref={menuRef}
            className="absolute right-3 top-11 z-30 w-44 bg-[#0f1011] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 backdrop-blur-2xl animate-in fade-in zoom-in-95 text-left"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(false);
                onDownload(track);
              }}
              disabled={isDownloading}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Spinner size="sm" className="w-3.5 h-3.5 text-[#8590ea]" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>음원 다운로드</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(false);
                onAddToQueue(track);
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>재생목록에 추가</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(false);
                onEdit(track);
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>정보 수정</span>
            </button>

            <div className="h-px bg-white/[0.06] my-1" />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(false);
                onDelete(track);
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>음원 삭제</span>
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};
