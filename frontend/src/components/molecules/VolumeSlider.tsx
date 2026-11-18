import React from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Slider } from '../atoms/Slider';
import { Tooltip } from '../atoms/Tooltip';

export interface VolumeSliderProps {
  volume: number; // 0 to 1
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  className?: string;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  className = '',
}) => {
  const effectiveVolume = isMuted ? 0 : volume;

  const renderIcon = () => {
    if (effectiveVolume === 0) {
      return <VolumeX className="w-4 h-4 text-neutral-400" />;
    }
    if (effectiveVolume < 0.5) {
      return <Volume1 className="w-4 h-4 text-neutral-300" />;
    }
    return <Volume2 className="w-4 h-4 text-neutral-200" />;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip content={isMuted ? '음소거 해제' : '음소거'} side="top">
        <button
          type="button"
          onClick={onToggleMute}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          {renderIcon()}
        </button>
      </Tooltip>
      <div className="w-24">
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={effectiveVolume}
          onChange={(val) => {
            onVolumeChange(val);
          }}
        />
      </div>
    </div>
  );
};
