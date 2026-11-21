import React, { useEffect } from 'react';
import { ListMusic, Trash2, X, Music, Shuffle } from 'lucide-react';
import type { MusicFileDto } from '../../../../types/music';
import { formatDurationMs } from '../../../../utils/formatTime';
import { Tooltip } from '../../../atoms/Tooltip';
import { useFlipList } from './useFlipList';

export interface PlayerQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: MusicFileDto[];
  isShuffle?: boolean;
  currentTrackId?: number;
  onPlayTrack: (track: MusicFileDto, index?: number) => void;
  onRemoveTrack: (index: number) => void;
  onClearQueue: () => void;
  onToggleShuffle?: () => void;
}

export const PlayerQueueDrawer: React.FC<PlayerQueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  isShuffle = false,
  currentTrackId,
  onPlayTrack,
  onRemoveTrack,
  onClearQueue,
  onToggleShuffle,
}) => {
  // Listen for Escape key to dismiss drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Compute collision-free stable item keys for FLIP reordering
  const itemKeys = queue.map((track, idx) => {
    let occurrence = 0;
    for (let i = 0; i < idx; i++) {
      if (queue[i].id === track.id) {
        occurrence++;
      }
    }
    return `${track.id}#${occurrence}`;
  });

  const { containerRef, registerItemRef } = useFlipList(itemKeys);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 top-0 bottom-16 md:bottom-20 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-expand drawer panel */}
      <aside
        aria-label="재생목록 대기열"
        className={`fixed top-0 bottom-16 md:bottom-20 right-0 w-full max-w-[380px] sm:w-96 bg-[#0f1011]/95 border-l border-white/[0.08] z-40 backdrop-blur-xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto shadow-[-12px_0_36px_rgba(0,0,0,0.5)]'
            : 'translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-[#8590ea]" />
            <div className="flex items-end gap-2">
              <h3 className="text-sm font-semibold text-neutral-100">재생목록</h3>
              <span className="text-xs text-neutral-500">({queue.length}곡)</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onToggleShuffle ? (
              <Tooltip content={isShuffle ? '셔플 끄기' : '셔플 켜기'} side="bottom">
                <button
                  type="button"
                  onClick={onToggleShuffle}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isShuffle
                      ? 'text-[#8590ea] bg-[#5e6ad2]/20 border-[#5e6ad2]/30'
                      : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                  aria-label={isShuffle ? '셔플 끄기' : '셔플 켜기'}
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </Tooltip>
            ) : null}

            {queue.length > 0 ? (
              <Tooltip content="목록 비우기" side="bottom">
                <button
                  type="button"
                  onClick={onClearQueue}
                  className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
                  aria-label="목록 비우기"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            ) : null}

            <Tooltip content="닫기" side="bottom">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
                aria-label="재생목록 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Queue items list */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-1 relative">
          {queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
              <Music className="w-8 h-8 mb-2 opacity-40 text-neutral-400" />
              <p className="text-xs">대기열이 비어 있습니다.</p>
            </div>
          ) : (
            queue.map((track, idx) => {
              const isPlayingThis = track.id === currentTrackId;
              const itemKey = itemKeys[idx];
              return (
                <div
                  key={itemKey}
                  ref={registerItemRef(itemKey)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl transition-colors duration-150 cursor-pointer will-change-transform ${
                    isPlayingThis
                      ? 'bg-[#5e6ad2]/15 text-[#8590ea] border border-[#5e6ad2]/20'
                      : 'hover:bg-white/[0.04] text-neutral-200 border border-transparent'
                  }`}
                  onClick={() => {
                    onPlayTrack(track, idx);
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11px] text-neutral-500 w-5 text-center">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">
                        {track.title || track.fileName}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">
                        {track.artist || '알 수 없음'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-neutral-400">
                      {formatDurationMs(track.durationMs)}
                    </span>
                    <Tooltip content="대기열에서 제거" side="left">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTrack(idx);
                        }}
                        className="p-1 text-neutral-500 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                        aria-label={`${track.title || track.fileName} 대기열에서 제거`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
