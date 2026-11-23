import React from 'react';
import { ExternalLink, Music, AlertCircle, Clock, Calendar, Pencil, Trash2 } from 'lucide-react';
import type { ExtractionJobDto } from '../../../types/extraction';
import { ExtractionStatusBadge } from './ExtractionStatusBadge';
import { Tooltip } from '../../atoms/Tooltip';

export interface ExtractionHistoryTableProps {
  jobs: ExtractionJobDto[];
  onGoToLibrary: () => void;
  onEditMetadata: (musicFileId: number) => void;
  onDeleteJob: (jobId: number) => void;
  onClearHistory: () => void;
  isClearing?: boolean;
  deletingJobId?: number | null;
}

export const ExtractionHistoryTable: React.FC<ExtractionHistoryTableProps> = ({
  jobs,
  onGoToLibrary,
  onEditMetadata,
  onDeleteJob,
  onClearHistory,
  isClearing = false,
  deletingJobId = null,
}) => {
  if (jobs.length === 0) {
    return (
      <div className="bg-[#0f1011] border border-white/[0.08] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-neutral-500">
          <Music className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-neutral-300">추출 내역이 없습니다</p>
        <p className="text-xs text-neutral-500 max-w-sm">
          상단에 YouTube 링크를 입력하여 첫 번째 고음질 음원을 추출해 보세요.
        </p>
      </div>
    );
  }

  const hasFinishedJobs = jobs.some((j) =>
    ['COMPLETED', 'FAILED', 'CANCELLED'].includes(j.status)
  );

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-[#0f1011] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-neutral-400" />
          <h3 className="text-xs font-semibold text-neutral-200">추출 작업 히스토리</h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-neutral-400 border border-white/[0.06]">
            {jobs.length}건
          </span>
        </div>

        {hasFinishedJobs ? (
          <button
            type="button"
            onClick={onClearHistory}
            disabled={isClearing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
            title="완료 및 종료된 추출 내역 모두 삭제 (보관함의 음원은 유지됩니다)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>기록 전체 삭제</span>
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-neutral-400 font-medium bg-white/[0.02]">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">추출 음원 정보</th>
              <th className="py-3 px-4 w-36">상태</th>
              <th className="py-3 px-4 w-40">요청 일시</th>
              <th className="py-3 px-4 w-44 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {jobs.map((job) => {
              const displayTitle = job.musicFileTitle || job.sourceUrl;
              const hasMusicFile = job.musicFileId !== null && job.status === 'COMPLETED';
              const isFinished = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status);
              const isDeletingThis = deletingJobId === job.id;

              return (
                <tr
                  key={job.id}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="py-3 px-4 text-center font-mono text-neutral-500">
                    {job.id}
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-white/[0.04] text-neutral-400 shrink-0 mt-0.5">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-medium text-neutral-100 truncate" title={displayTitle}>
                          {displayTitle}
                        </p>
                        {job.musicFileArtist ? (
                          <p className="text-[11px] text-neutral-400 truncate">
                            {job.musicFileArtist}
                          </p>
                        ) : null}
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#8590ea] hover:underline flex items-center gap-1 mt-0.5 truncate"
                        >
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{job.sourceUrl}</span>
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <ExtractionStatusBadge status={job.status} />
                      {job.status === 'FAILED' && job.errorMessage ? (
                        <Tooltip content={job.errorMessage}>
                          <button
                            type="button"
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-neutral-400 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-neutral-500" />
                      <span>{formatDate(job.createdAt)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {hasMusicFile ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Tooltip content="메타데이터 수정">
                          <button
                            type="button"
                            onClick={() => onEditMetadata(job.musicFileId!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 text-[#8590ea]" />
                            <span className="hidden sm:inline">수정</span>
                          </button>
                        </Tooltip>

                        <button
                          type="button"
                          onClick={onGoToLibrary}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#8590ea] hover:text-white bg-[#5e6ad2]/10 hover:bg-[#5e6ad2]/25 border border-[#5e6ad2]/20 transition-colors cursor-pointer"
                        >
                          <span>듣기</span>
                        </button>

                        <Tooltip content="기록 삭제 (음원은 보관함에 안전하게 유지됩니다)">
                          <button
                            type="button"
                            onClick={() => onDeleteJob(job.id)}
                            disabled={isDeletingThis}
                            className="p-1 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                            title="기록 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    ) : isFinished ? (
                      <div className="flex items-center justify-end">
                        <Tooltip content="기록 삭제">
                          <button
                            type="button"
                            onClick={() => onDeleteJob(job.id)}
                            disabled={isDeletingThis}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>삭제</span>
                          </button>
                        </Tooltip>
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-500 font-mono">진행 중</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
