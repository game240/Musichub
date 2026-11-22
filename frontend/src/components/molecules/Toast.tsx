import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import type { ToastItem, ToastType } from '../../stores/toastStore';
import { cn } from '../../utils/cn';

export interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

const renderIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
    case 'info':
    default:
      return <Info className="w-4 h-4 text-[#8590ea] shrink-0" />;
  }
};

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const isExiting = toast.isExiting;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl',
        'bg-[#18191b]/95 border border-white/10 text-neutral-100 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        'backdrop-blur-xl text-xs sm:text-sm font-medium break-keep select-none max-w-sm sm:max-w-md w-full',
        'transition-all duration-200 ease-out',
        isExiting
          ? 'opacity-0 -translate-y-2.5 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-top-2',
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {renderIcon(toast.type)}
        <span className="truncate sm:whitespace-normal leading-snug text-neutral-200">
          {toast.message}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="p-1 -mr-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
        aria-label="닫기"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
