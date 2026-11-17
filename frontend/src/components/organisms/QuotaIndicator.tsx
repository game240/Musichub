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

  let colorClass = 'bg-[#5e6ad2]';
  if (percentage > 90) {
    colorClass = 'bg-[#eb5757]';
  } else if (percentage > 75) {
    colorClass = 'bg-[#f2994a]';
  }

  return (
    <div
      className={`flex flex-col gap-1.5 min-w-[160px] ${className}`}
      title={`보관함 사용량: ${formatBytes(usedBytes)} / ${formatBytes(maxBytes)} (${Math.round(percentage)}%)`}
    >
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span className="flex items-center gap-1.5 font-medium">
          <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
          <span>저장 공간</span>
        </span>
        <span className="text-neutral-300">
          {formatBytes(usedBytes)} / {formatBytes(maxBytes)}
        </span>
      </div>
      <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
