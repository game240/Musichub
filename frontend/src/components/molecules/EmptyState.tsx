import React from 'react';
import { Music2 } from 'lucide-react';
import { Button } from '../atoms/Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white/[0.015] border border-white/[0.08] ${className}`}
    >
      <div className="p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-[#5e6ad2] mb-4 shadow-inner">
        {icon ? icon : <Music2 className="w-9 h-9" />}
      </div>
      <h3 className="text-base font-semibold text-neutral-100 mb-1.5">{title}</h3>
      <p className="text-sm text-neutral-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction ? (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
};
