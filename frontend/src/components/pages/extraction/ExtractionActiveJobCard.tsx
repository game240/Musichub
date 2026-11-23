import React from 'react';
import { Loader2, DownloadCloud, RefreshCw, UploadCloud, CheckCircle2 } from 'lucide-react';
import type { ExtractionJobDto, ExtractionJobStatus } from '../../../types/extraction';

export interface ExtractionActiveJobCardProps {
  job: ExtractionJobDto;
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
      return -1;
  }
};

export const ExtractionActiveJobCard: React.FC<ExtractionActiveJobCardProps> = ({ job }) => {
  const currentStep = getStepIndex(job.status);
  const progressPercent =
    currentStep >= 0 ? Math.round(((currentStep + 1) / STEPS.length) * 100) : 0;

  return (
    <div className="bg-[#0f1011] border border-[#5e6ad2]/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl animate-fade-in">
      {/* Background glowing gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#5e6ad2]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#5e6ad2] animate-ping" />
            <span className="text-xs font-semibold text-neutral-100">
              현재 음원 추출 진행 중 (#{job.id})
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-md">
            {job.sourceUrl}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono font-semibold text-[#8590ea]">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden mb-5">
        <div
          className="bg-gradient-to-r from-[#5e6ad2] to-[#8590ea] h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
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
