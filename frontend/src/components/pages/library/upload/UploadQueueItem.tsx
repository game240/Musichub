import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, Music } from 'lucide-react';
import { formatBytes } from '../../../../utils/formatBytes';
import { ProgressBar } from '../../../atoms/ProgressBar';

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'error';

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  errorMessage?: string;
}

export interface UploadQueueItemProps {
  item: UploadItem;
}

export const UploadQueueItem: React.FC<UploadQueueItemProps> = ({ item }) => {
  const renderStatus = () => {
    switch (item.status) {
      case 'pending': {
        return <span className="text-xs text-slate-400">Waiting...</span>;
      }
      case 'uploading': {
        return (
          <span className="text-xs text-indigo-400 flex items-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Uploading {item.progress}%
          </span>
        );
      }
      case 'processing': {
        return (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Reading Tags...
          </span>
        );
      }
      case 'completed': {
        return (
          <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Done
          </span>
        );
      }
      case 'error': {
        return (
          <span className="text-xs text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {item.errorMessage || 'Failed'}
          </span>
        );
      }
    }
  };

  return (
    <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-slate-700/50 rounded-lg text-slate-300 shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{item.file.name}</p>
            <p className="text-[11px] text-slate-400">{formatBytes(item.file.size)}</p>
          </div>
        </div>
        <div className="shrink-0">{renderStatus()}</div>
      </div>

      {item.status === 'uploading' ? <ProgressBar progress={item.progress} color="indigo" /> : null}
    </div>
  );
};
