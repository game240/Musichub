import React from 'react';
import { Slider } from '../../atoms/Slider';
import { formatSeconds } from '../../../utils/formatTime';

export interface PlayerSeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
}

export const PlayerSeekBar: React.FC<PlayerSeekBarProps> = ({
  currentTime,
  duration,
  onSeek,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2.5 w-full ${className}`}>
      <span className="text-[11px] text-neutral-400 w-9 text-right select-none">
        {formatSeconds(currentTime)}
      </span>
      <Slider
        min={0}
        max={duration || 100}
        step={0.5}
        value={currentTime}
        onChange={onSeek}
        disabled={duration === 0}
      />
      <span className="text-[11px] text-neutral-400 w-9 select-none">
        {formatSeconds(duration)}
      </span>
    </div>
  );
};
