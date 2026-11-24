import React, { useState, useEffect } from 'react';
import { Loader2, DownloadCloud, RefreshCw, UploadCloud, CheckCircle2, XCircle, X } from 'lucide-react';
import type { ExtractionJobDto, ExtractionJobStatus } from '../../../types/extraction';
import { Spinner } from '../../atoms/Spinner';

export interface ExtractionActiveJobCardProps {
  job: ExtractionJobDto;
  onCancel?: (jobId: number) => void;
  onClose?: () => void;
  isCancelling?: boolean;
  totalActiveCount?: number;
}

const STEPS: Array<{ key: ExtractionJobStatus; label: string; icon: React.FC<{ className?: string }> }> = [
  { key: 'PENDING', label: '대기 중', icon: Loader2 },
  { key: 'DOWNLOADING', label: '다운로드', icon: DownloadCloud },
  { key: 'CONVERTING', label: 'MP3 변환', icon: RefreshCw },
  { key: 'UPLOADING', label: 'R2 업로드', icon: UploadCloud },
  { key: 'COMPLETED', label: '완료', icon: CheckCircle2 },
];

const getStepIndex = (status: ExtractionJobStatus): number => {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'DOWNLOADING':
      return 1;
    case 'CONVERTING':
      return 2;
    case 'UPLOADING':
      return 3;
    case 'COMPLETED':
      return 4;
    case 'FAILED':
    case 'CANCELLED':
      return -1;
  }
};

export const ExtractionActiveJobCard: React.FC<ExtractionActiveJobCardProps> = ({
  job,
  onCancel,
  onClose,
  isCancelling = false,
  totalActiveCount = 1,
}) => {
  const currentStep = getStepIndex(job.status);
  const [progressPercent, setProgressPercent] = useState(1);

  const getMinPercentForStatus = (status: ExtractionJobStatus): number => {
    switch (status) {
      case 'PENDING':
        return 1;
      case 'DOWNLOADING':
        return 15;
      case 'CONVERTING':
        return 55;
      case 'UPLOADING':
        return 85;
      case 'COMPLETED':
        return 100;
      default:
        return 1;
    }
  };

  const displayedPercent =
    job.status === 'COMPLETED'
      ? 100
      : Math.max(progressPercent, getMinPercentForStatus(job.status));

  // 1%부터 시작하여 단계별로 부드럽게 증가하는 프로그레스 바
  useEffect(() => {
    if (
      job.status === 'COMPLETED' ||
      job.status === 'FAILED' ||
      job.status === 'CANCELLED'
    ) {
      return;
    }

    let min = 1;
    let max = 14;
    let stepInterval = 800;

    switch (job.status) {
      case 'PENDING':
        min = 1;
        max = 14;
        stepInterval = 800;
        break;
      case 'DOWNLOADING':
        min = 15;
        max = 52;
        stepInterval = 550;
        break;
      case 'CONVERTING':
        min = 55;
        max = 82;
        stepInterval = 450;
        break;
      case 'UPLOADING':
        min = 85;
        max = 97;
        stepInterval = 300;
        break;
    }

    const timer = setInterval(() => {
      setProgressPercent((prev) => {
        const base = Math.max(prev, min);
        if (base < max) {
          return base + 1;
        }
        return base;
      });
    }, stepInterval);

    return () => clearInterval(timer);
  }, [job.status]);

  const canCancel =
    onCancel &&
    job.status !== 'COMPLETED' &&
    job.status !== 'FAILED' &&
    job.status !== 'CANCELLED';

  return (
    <div className="bg-[#0f1011] border border-[#5e6ad2]/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-100">
              {job.status === 'COMPLETED'
                ? `추출 완료 (#${job.id})`
                : job.status === 'FAILED'
                ? `추출 실패 (#${job.id})`
                : job.status === 'CANCELLED'
                ? `추출 취소됨 (#${job.id})`
                : `음원 추출 진행 중 (#${job.id})`}
            </span>
            {totalActiveCount > 1 ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#5e6ad2]/20 text-[#8590ea] border border-[#5e6ad2]/30">
                총 {totalActiveCount}개 작업 진행 중 · 하단 목록 클릭으로 전환 가능
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-md">
            {job.musicFileTitle || job.sourceUrl}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs font-mono font-semibold text-[#8590ea]">
            {displayedPercent}%
          </span>

          {canCancel ? (
            <button
              type="button"
              onClick={() => onCancel(job.id)}
              disabled={isCancelling}
              title="추출 작업 중단"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isCancelling ? (
                <>
                  <Spinner size="sm" />
                  <span>중단 중...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>추출 중단</span>
                </>
              )}
            </button>
          ) : onClose ? (
            <button
              type="button"
              onClick={onClose}
              title="상태 카드 닫기"
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden mb-5">
        <div
          className="bg-[#5e6ad2] h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${displayedPercent}%` }}
        />
      </div>

      {/* Steps visualization */}
      <div className="grid grid-cols-5 gap-2 relative z-10">
        {STEPS.map((step, idx) => {
          const isDone = currentStep > idx;
          const isCurrent = currentStep === idx;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                isCurrent
                  ? 'bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 text-white'
                  : isDone
                  ? 'text-neutral-400'
                  : 'text-neutral-600'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isCurrent
                    ? 'bg-[#5e6ad2] text-white shadow-lg shadow-[#5e6ad2]/50'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/[0.05] text-neutral-500'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isCurrent && step.key === 'CONVERTING'
                      ? 'animate-spin'
                      : isCurrent
                      ? 'animate-pulse'
                      : ''
                  }`}
                />
              </div>
              <span className="text-[10px] font-medium text-center truncate w-full">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
