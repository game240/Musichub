import React from 'react';
import { ListMusic, Trash2, X, Music } from 'lucide-react';
import type { MusicFileDto } from '../../../../types/music';
import { formatDurationMs } from '../../../../utils/formatTime';
import { SimpleTooltip } from '../../../atoms/Tooltip';

export interface PlayerQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: MusicFileDto[];
  currentTrackId?: number;
  onPlayTrack: (track: MusicFileDto) => void;
  onRemoveTrack: (index: number) => void;
  onClearQueue: () => void;
}

export const PlayerQueueDrawer: React.FC<PlayerQueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  currentTrackId,
  onPlayTrack,
  onRemoveTrack,
  onClearQueue,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#0f1011]/95 border-l border-white/[0.08] shadow-2xl z-50 backdrop-blur-xl flex flex-col animate-slide-left">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-[#8590ea]" />
          <h3 className="text-sm font-semibold text-neutral-100">재생목록</h3>
          <span className="text-xs text-neutral-500">({queue.length}곡)</span>
        </div>
        <div className="flex items-center gap-1">
          {queue.length > 0 ? (
            <SimpleTooltip content="목록 비우기" side="bottom">
              <button
                type="button"
                onClick={onClearQueue}
                className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </SimpleTooltip>
          ) : null}
          <SimpleTooltip content="닫기" side="bottom">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </SimpleTooltip>
        </div>
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <Music className="w-8 h-8 mb-2 opacity-40 text-neutral-400" />
            <p className="text-xs">대기열이 비어 있습니다.</p>
          </div>
        ) : (
          queue.map((track, idx) => {
            const isPlayingThis = track.id === currentTrackId;
            return (
              <div
                key={`${track.id}-${idx}`}
                className={`group flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                  isPlayingThis
                    ? 'bg-[#5e6ad2]/15 text-[#8590ea] border border-[#5e6ad2]/20'
                    : 'hover:bg-white/[0.04] text-neutral-200 border border-transparent'
                }`}
                onClick={() => {
                  onPlayTrack(track);
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] text-neutral-500 w-5 text-center">{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{track.title || track.fileName}</p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {track.artist || '알 수 없음'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-neutral-400">
                    {formatDurationMs(track.durationMs)}
                  </span>
                  <SimpleTooltip content="대기열에서 제거" side="left">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTrack(idx);
                      }}
                      className="p-1 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </SimpleTooltip>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
