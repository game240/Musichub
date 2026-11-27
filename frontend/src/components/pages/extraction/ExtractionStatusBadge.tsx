import React from 'react';
import {
  Clock,
  DownloadCloud,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Ban,
} from 'lucide-react';
import type { ExtractionJobStatus } from '../../../types/extraction';

export interface ExtractionStatusBadgeProps {
  status: ExtractionJobStatus;
}

export const ExtractionStatusBadge: React.FC<ExtractionStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
          <Clock className="w-3 h-3 text-neutral-400" />
          대기 중
        </span>
      );
    case 'DOWNLOADING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
          <DownloadCloud className="w-3 h-3 text-amber-400 animate-pulse" />
          다운로드 중
        </span>
      );
    case 'CONVERTING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
          <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
          MP3 변환 중
        </span>
      );
    case 'UPLOADING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          <UploadCloud className="w-3 h-3 text-indigo-400 animate-bounce" />
          보관함 업로드 중
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          추출 완료
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          <AlertCircle className="w-3 h-3 text-red-400" />
          실패
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
          <Ban className="w-3 h-3 text-neutral-400" />
          취소됨
        </span>
      );
  }
};
