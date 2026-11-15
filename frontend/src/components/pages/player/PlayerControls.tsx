import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import type { RepeatMode } from '../../../stores/playerStore';

export interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrev: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  isLoading,
  isShuffle,
  repeatMode,
  onTogglePlay,
  onPlayNext,
  onPlayPrev,
  onToggleShuffle,
  onToggleRepeat,
}) => {
  const renderRepeatIcon = () => {
    if (repeatMode === 'ONE') {
      return <Repeat1 className="w-4 h-4 text-indigo-400" />;
    }
    if (repeatMode === 'ALL') {
      return <Repeat className="w-4 h-4 text-indigo-400" />;
    }
    return <Repeat className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="flex items-center gap-3">
      {/* Shuffle */}
      <button
        type="button"
        title="Shuffle"
        onClick={onToggleShuffle}
        className={`p-2 rounded-lg transition-colors ${
          isShuffle
            ? 'text-indigo-400 bg-indigo-950/40'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Shuffle className="w-4 h-4" />
      </button>

      {/* Prev */}
      <button
        type="button"
        title="Previous"
        onClick={onPlayPrev}
        className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
      >
        <SkipBack className="w-5 h-5 fill-current" />
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        title={isPlaying ? 'Pause' : 'Play'}
        onClick={onTogglePlay}
        disabled={isLoading}
        className="p-3 bg-white hover:bg-slate-200 text-slate-900 rounded-full transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-white/10 disabled:opacity-50"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Next */}
      <button
        type="button"
        title="Next"
        onClick={onPlayNext}
        className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
      >
        <SkipForward className="w-5 h-5 fill-current" />
      </button>

      {/* Repeat */}
      <button
        type="button"
        title={`Repeat: ${repeatMode}`}
        onClick={onToggleRepeat}
        className={`p-2 rounded-lg transition-colors ${
          repeatMode !== 'OFF' ? 'bg-indigo-950/40' : 'hover:text-white hover:bg-slate-800'
        }`}
      >
        {renderRepeatIcon()}
      </button>
    </div>
  );
};
