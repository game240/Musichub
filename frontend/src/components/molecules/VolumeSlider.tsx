import React from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Slider } from '../atoms/Slider';

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
      return <VolumeX className="w-4 h-4 text-slate-400" />;
    }
    if (effectiveVolume < 0.5) {
      return <Volume1 className="w-4 h-4 text-slate-300" />;
    }
    return <Volume2 className="w-4 h-4 text-slate-200" />;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onToggleMute}
        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
      >
        {renderIcon()}
      </button>
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
