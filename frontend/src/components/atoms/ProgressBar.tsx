import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: 'indigo' | 'emerald' | 'amber' | 'rose';
  className?: string;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'indigo',
  className = '',
  showLabel = false,
}) => {
  const safeProgress = Math.max(0, Math.min(100, progress));

  const colorClasses = {
    indigo: 'bg-[#5e6ad2]',
    emerald: 'bg-[#27a672]',
    amber: 'bg-[#f2994a]',
    rose: 'bg-[#eb5757]',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel ? (
        <div className="flex justify-between text-xs text-neutral-400 mb-1">
          <span>진행률</span>
          <span>{Math.round(safeProgress)}%</span>
        </div>
      ) : null}
      <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${colorClasses[color]}`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
};
