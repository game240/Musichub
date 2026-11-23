import React, { useState, useEffect } from 'react';
import { Loader2, DownloadCloud, RefreshCw, UploadCloud, CheckCircle2, XCircle } from 'lucide-react';
import type { ExtractionJobDto, ExtractionJobStatus } from '../../../types/extraction';
import { Spinner } from '../../atoms/Spinner';

export interface ExtractionActiveJobCardProps {
  job: ExtractionJobDto;
  onCancel?: (jobId: number) => void;
  isCancelling?: boolean;
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
  isCancelling = false,
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
    <div className="bg-[#0f1011] border border-white/[0.1] rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5e6ad2] shrink-0" />
            <span className="text-xs font-semibold text-neutral-200">
              음원 추출 진행 중
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
              #{job.id}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 truncate max-w-md font-mono">
            {job.sourceUrl}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs font-mono font-medium text-neutral-300">
            {displayedPercent}%
          </span>

          {canCancel ? (
            <button
              type="button"
              onClick={() => onCancel(job.id)}
              disabled={isCancelling}
              title="추출 작업 중단"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-400 hover:text-red-400 bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isCancelling ? (
                <>
                  <Spinner size="sm" />
                  <span>중단 중...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>중단</span>
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/[0.06] rounded-full h-1 overflow-hidden my-4">
        <div
          className="bg-[#5e6ad2] h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${displayedPercent}%` }}
        />
      </div>

      {/* Steps visualization */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {STEPS.map((step, idx) => {
          const isDone = currentStep > idx;
          const isCurrent = currentStep === idx;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                isCurrent
                  ? 'bg-[#5e6ad2]/10 border-[#5e6ad2]/40 text-neutral-100'
                  : isDone
                  ? 'bg-white/[0.02] border-white/[0.06] text-neutral-400'
                  : 'bg-transparent border-transparent text-neutral-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-[#5e6ad2] text-white'
                    : isDone
                    ? 'bg-[#27a672]/15 text-[#27a672] border border-[#27a672]/30'
                    : 'bg-white/[0.04] text-neutral-600'
                }`}
              >
                <Icon
                  className={`w-3 h-3 ${
                    isCurrent && step.key === 'CONVERTING'
                      ? 'animate-spin'
                      : ''
                  }`}
                />
              </div>
              <span className="text-[11px] font-medium truncate">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
