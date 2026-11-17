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
        return <span className="text-xs text-neutral-500">대기 중</span>;
      }
      case 'uploading': {
        return (
          <span className="text-xs text-[#8590ea] flex items-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            업로드 중 {item.progress}%
          </span>
        );
      }
      case 'processing': {
        return (
          <span className="text-xs text-[#f2994a] flex items-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            메타데이터 추출 중...
          </span>
        );
      }
      case 'completed': {
        return (
          <span className="text-xs text-[#27a672] flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            완료
          </span>
        );
      }
      case 'error': {
        return (
          <span className="text-xs text-[#eb5757] flex items-center gap-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {item.errorMessage || '업로드 실패'}
          </span>
        );
      }
    }
  };

  return (
    <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-white/[0.05] rounded-lg text-neutral-300 shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-neutral-200 truncate">{item.file.name}</p>
            <p className="text-[11px] text-neutral-500">{formatBytes(item.file.size)}</p>
          </div>
        </div>
        <div className="shrink-0">{renderStatus()}</div>
      </div>

      {item.status === 'uploading' ? <ProgressBar progress={item.progress} color="indigo" /> : null}
    </div>
  );
};
