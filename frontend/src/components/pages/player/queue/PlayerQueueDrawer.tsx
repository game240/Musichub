import React from 'react';
import { ListMusic, Trash2, X, Music } from 'lucide-react';
import type { MusicFileDto } from '../../../../types/music';
import { formatDurationMs } from '../../../../utils/formatTime';

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
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-slate-900/95 border-l border-slate-800 shadow-2xl z-50 backdrop-blur-xl flex flex-col animate-slide-left">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-100">Play Queue</h3>
          <span className="text-xs text-slate-500 font-mono">({queue.length})</span>
        </div>
        <div className="flex items-center gap-1">
          {queue.length > 0 ? (
            <button
              type="button"
              onClick={onClearQueue}
              title="Clear queue"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Music className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">Your queue is empty.</p>
          </div>
        ) : (
          queue.map((track, idx) => {
            const isPlayingThis = track.id === currentTrackId;
            return (
              <div
                key={`${track.id}-${idx}`}
                className={`group flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                  isPlayingThis
                    ? 'bg-indigo-950/40 text-indigo-300'
                    : 'hover:bg-slate-800/60 text-slate-200'
                }`}
                onClick={() => {
                  onPlayTrack(track);
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-mono text-slate-500 w-5 text-center">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{track.title || track.fileName}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {track.artist || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatDurationMs(track.durationMs)}
                  </span>
                  <button
                    type="button"
                    title="Remove from queue"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(idx);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
