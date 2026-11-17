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
      return <Repeat1 className="w-4 h-4 text-[#8590ea]" />;
    }
    if (repeatMode === 'ALL') {
      return <Repeat className="w-4 h-4 text-[#8590ea]" />;
    }
    return <Repeat className="w-4 h-4 text-neutral-400" />;
  };

  const repeatTooltip =
    repeatMode === 'ONE' ? '한 곡 반복' : repeatMode === 'ALL' ? '전체 반복' : '반복 끄기';

  return (
    <div className="flex items-center gap-2">
      {/* Shuffle */}
      <button
        type="button"
        title={isShuffle ? '셔플 끄기' : '셔플 켜기'}
        onClick={onToggleShuffle}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          isShuffle
            ? 'text-[#8590ea] bg-[#5e6ad2]/15 border border-[#5e6ad2]/30'
            : 'text-neutral-400 hover:text-white hover:bg-white/[0.05]'
        }`}
      >
        <Shuffle className="w-4 h-4" />
      </button>

      {/* Prev */}
      <button
        type="button"
        title="이전 곡"
        onClick={onPlayPrev}
        className="p-1.5 text-neutral-300 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
      >
        <SkipBack className="w-4 h-4 fill-current" />
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        title={isPlaying ? '일시정지 (Space)' : '재생 (Space)'}
        onClick={onTogglePlay}
        disabled={isLoading}
        className="p-2.5 bg-white hover:bg-neutral-200 text-black rounded-full transition-transform hover:scale-105 active:scale-95 shadow-md shadow-white/10 disabled:opacity-50 cursor-pointer"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Next */}
      <button
        type="button"
        title="다음 곡"
        onClick={onPlayNext}
        className="p-1.5 text-neutral-300 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
      >
        <SkipForward className="w-4 h-4 fill-current" />
      </button>

      {/* Repeat */}
      <button
        type="button"
        title={`반복: ${repeatTooltip}`}
        onClick={onToggleRepeat}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          repeatMode !== 'OFF'
            ? 'bg-[#5e6ad2]/15 border border-[#5e6ad2]/30'
            : 'hover:text-white hover:bg-white/[0.05]'
        }`}
      >
        {renderRepeatIcon()}
      </button>
    </div>
  );
};
