import React from 'react';
import { Clock, DownloadCloud, RefreshCw, UploadCloud, CheckCircle2, AlertCircle, Ban } from 'lucide-react';
import type { ExtractionJobStatus } from '../../../types/extraction';

export interface ExtractionStatusBadgeProps {
  status: ExtractionJobStatus;
}

export const ExtractionStatusBadge: React.FC<ExtractionStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
          <Clock className="w-3 h-3 text-neutral-500" />
          대기 중
        </span>
      );
    case 'DOWNLOADING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
          <DownloadCloud className="w-3 h-3 text-amber-400" />
          다운로드 중
        </span>
      );
    case 'CONVERTING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
          <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
          변환 중
        </span>
      );
    case 'UPLOADING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#5e6ad2]/15 text-[#8590ea] border border-[#5e6ad2]/30">
          <UploadCloud className="w-3 h-3 text-[#8590ea]" />
          업로드 중
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#27a672]/15 text-[#27a672] border border-[#27a672]/30">
          <CheckCircle2 className="w-3 h-3 text-[#27a672]" />
          추출 완료
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#eb5757]/15 text-[#eb5757] border border-[#eb5757]/30">
          <AlertCircle className="w-3 h-3 text-[#eb5757]" />
          실패
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/[0.04] text-neutral-500 border border-white/[0.08]">
          <Ban className="w-3 h-3 text-neutral-500" />
          취소됨
        </span>
      );
  }
};
