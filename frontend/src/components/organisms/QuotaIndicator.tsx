import React from 'react';
import { HardDrive } from 'lucide-react';
import { formatBytes } from '../../utils/formatBytes';

export interface QuotaIndicatorProps {
  usedBytes: number;
  maxBytes?: number; // default: 2.0 GB (2147483648)
  className?: string;
}

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({
  usedBytes,
  maxBytes = 2147483648, // 2 GB
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (usedBytes / maxBytes) * 100));

  let colorClass = 'bg-emerald-500';
  if (percentage > 90) {
    colorClass = 'bg-rose-500';
  } else if (percentage > 70) {
    colorClass = 'bg-amber-500';
  }

  return (
    <div className={`flex flex-col gap-1.5 min-w-[160px] ${className}`}>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <HardDrive className="w-3.5 h-3.5" />
          <span>Storage</span>
        </span>
        <span className="font-mono text-slate-300">
          {formatBytes(usedBytes)} / {formatBytes(maxBytes)}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
