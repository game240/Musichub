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
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel ? (
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(safeProgress)}%</span>
        </div>
      ) : null}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${colorClasses[color]}`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
};
