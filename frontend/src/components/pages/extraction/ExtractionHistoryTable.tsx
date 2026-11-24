import React from 'react';
import { ExternalLink, Music, AlertCircle, Clock, Calendar, Pencil, Trash2 } from 'lucide-react';
import type { ExtractionJobDto } from '../../../types/extraction';
import { ExtractionStatusBadge } from './ExtractionStatusBadge';
import { Tooltip } from '../../atoms/Tooltip';
import { Checkbox } from '../../atoms/Checkbox';
import { Spinner } from '../../atoms/Spinner';
import { cn } from '../../../utils/cn';

export interface ExtractionHistoryTableProps {
  jobs: ExtractionJobDto[];
  selectedJobIds: Set<number>;
  focusedJobId?: number | null;
  onFocusJob?: (jobId: number) => void;
  onToggleSelectJob: (jobId: number) => void;
  onToggleSelectAll: () => void;
  onBatchEdit: () => void;
  isBatchLoading?: boolean;
  onEditMetadata: (musicFileId: number) => void;
  onDeleteJob: (jobId: number) => void;
  onDeleteSelected?: () => void;
  deletingJobId?: number | null;
}

export const ExtractionHistoryTable: React.FC<ExtractionHistoryTableProps> = ({
  jobs,
  selectedJobIds,
  focusedJobId = null,
  onFocusJob,
  onToggleSelectJob,
  onToggleSelectAll,
  onBatchEdit,
  isBatchLoading = false,
  onEditMetadata,
  onDeleteJob,
  onDeleteSelected,
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

  const selectableJobs = jobs.filter((j) => j.status === 'COMPLETED' && j.musicFileId !== null);
  const isAllSelected =
    selectableJobs.length > 0 && selectableJobs.every((j) => selectedJobIds.has(j.id));
  const isIndeterminate =
    !isAllSelected && selectableJobs.some((j) => selectedJobIds.has(j.id));
  const isSelectionMode = selectedJobIds.size > 0;
  const showMasterCheckbox = isSelectionMode || isAllSelected || isIndeterminate;

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      const hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const period = hours >= 12 ? '오후' : '오전';
      const hour12 = hours % 12 === 0 ? 12 : hours % 12;
      const formattedHour = String(hour12).padStart(2, '0');

      return `${year}-${month}-${day} ${period} ${formattedHour}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-[#0f1011] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
      {/* Table Card Header with Fixed Height */}
      <div className="px-5 border-b border-white/[0.06] flex items-center justify-between h-[60px] min-h-[60px]">
        <div className="h-8 flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
          <h3 className="text-xs font-semibold text-neutral-200 shrink-0">추출 작업 히스토리</h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-neutral-400 border border-white/[0.06] shrink-0">
            {jobs.length}건
          </span>
          {isSelectionMode && (
            <span className="h-5 flex items-center text-[11px] font-mono px-2 rounded-full bg-[#5e6ad2]/20 text-[#8590ea] border border-[#5e6ad2]/30 shrink-0 animate-in fade-in duration-150">
              {selectedJobIds.size}개 선택됨
            </span>
          )}
        </div>

        <div className="h-8 flex items-center gap-2 shrink-0">
          {isSelectionMode && (
            <>
              <button
                type="button"
                onClick={onBatchEdit}
                disabled={isBatchLoading}
                className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium text-white bg-[#5e6ad2] hover:bg-[#6f7cf4] shadow-sm shadow-[#5e6ad2]/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isBatchLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <Pencil className="w-3.5 h-3.5" />
                )}
                <span>선택 음원 정보 일괄 수정</span>
              </button>
              {onDeleteSelected ? (
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer"
                  title="선택한 추출 기록 삭제 (보관함의 음원은 유지됩니다)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>선택 항목 삭제</span>
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-xs border-collapse min-w-[720px]">
          <thead>
            <tr className="group/head border-b border-white/[0.06] text-neutral-400 font-medium bg-white/[0.02]">
              <th className="w-12 py-3 px-2 text-center select-none">
                <div className="w-7 h-7 mx-auto relative flex items-center justify-center">
                  {selectableJobs.length > 0 ? (
                    <>
                      <div
                        className={cn(
                          'absolute inset-0 flex items-center justify-center transition-opacity duration-150',
                          showMasterCheckbox
                            ? 'opacity-100 z-10 pointer-events-auto'
                            : 'opacity-0 group-hover/head:opacity-100 z-10 pointer-events-none group-hover/head:pointer-events-auto',
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isAllSelected}
                          indeterminate={isIndeterminate}
                          onChange={() => onToggleSelectAll()}
                          aria-label="완료된 음원 전체 선택"
                        />
                      </div>
                      <span
                        className={cn(
                          'font-mono text-neutral-500 transition-opacity duration-150',
                          showMasterCheckbox
                            ? 'opacity-0 pointer-events-none'
                            : 'opacity-100 group-hover/head:opacity-0',
                        )}
                      >
                        #
                      </span>
                    </>
                  ) : (
                    <span className="font-mono text-neutral-500">#</span>
                  )}
                </div>
              </th>
              <th className="py-3 px-4 w-auto">추출 음원 정보</th>
              <th className="py-3 px-4 w-32 sm:w-36">상태</th>
              <th className="py-3 px-4 w-44 sm:w-48">추출 날짜</th>
              <th className="py-3 px-4 w-32 sm:w-36 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {jobs.map((job) => {
              const displayTitle = job.musicFileTitle || job.sourceUrl;
              const hasMusicFile = job.musicFileId !== null && job.status === 'COMPLETED';
              const isFinished = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status);
              const isDeletingThis = deletingJobId === job.id;
              const isSelected = selectedJobIds.has(job.id);
              const isFocused = focusedJobId === job.id;

              return (
                <Tooltip
                  key={job.id}
                  content={
                    isFocused
                      ? '현재 상단에 상태가 표시 중인 곡입니다'
                      : '클릭하여 상단에서 진행 상태 확인'
                  }
                  side="top"
                >
                  <tr
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        target.closest('a') ||
                        target.closest('button') ||
                        target.closest('input')
                      ) {
                        return;
                      }
                      if (onFocusJob) {
                        onFocusJob(job.id);
                      }
                    }}
                    className={cn(
                      'transition-colors duration-150 group cursor-pointer relative',
                      isSelected && isFocused
                        ? 'bg-[#5e6ad2]/[0.12] hover:bg-[#5e6ad2]/[0.16]'
                        : isSelected
                        ? 'bg-[#5e6ad2]/[0.08] hover:bg-[#5e6ad2]/[0.12]'
                        : isFocused
                        ? 'bg-[#5e6ad2]/[0.05] hover:bg-[#5e6ad2]/[0.09]'
                        : 'hover:bg-white/[0.02]',
                    )}
                  >
                  {/* Column 1: Checkbox only column */}
                  <td
                    className={cn(
                      'w-12 py-3 px-2 text-center select-none relative',
                      hasMusicFile && 'cursor-pointer',
                    )}
                    onClick={(e) => {
                      if (hasMusicFile) {
                        e.stopPropagation();
                        onToggleSelectJob(job.id);
                      }
                    }}
                    title={hasMusicFile ? (isSelected ? '선택 해제' : '선택') : undefined}
                  >
                    {/* Left active indicator line for the currently focused/inspected job */}
                    {isFocused && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#5e6ad2] rounded-r z-20 shadow-sm shadow-[#5e6ad2]/50" />
                    )}

                    <div className="w-7 h-7 mx-auto relative flex items-center justify-center">
                      {hasMusicFile ? (
                        <>
                          <div
                            className={cn(
                              'absolute inset-0 flex items-center justify-center transition-opacity duration-150',
                              isSelected || isSelectionMode
                                ? 'opacity-100 z-10 pointer-events-auto'
                                : 'opacity-0 group-hover:opacity-100 z-10 pointer-events-none group-hover:pointer-events-auto',
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => onToggleSelectJob(job.id)}
                              aria-label={`${displayTitle} 선택`}
                            />
                          </div>
                          <span
                            className={cn(
                              'font-mono text-neutral-500 transition-opacity duration-150',
                              isSelected || isSelectionMode
                                ? 'opacity-0 pointer-events-none'
                                : 'opacity-100 group-hover:opacity-0',
                            )}
                          >
                            {job.id}
                          </span>
                        </>
                      ) : (
                        <span className="font-mono text-neutral-500">{job.id}</span>
                      )}
                    </div>
                  </td>

                  {/* Column 2: Song Info */}
                  <td className="py-3 px-4 w-auto overflow-hidden">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-white/[0.04] text-neutral-400 shrink-0 mt-0.5">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden min-w-0 flex-1">
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

                  {/* Column 3: Status Badge */}
                  <td className="py-3 px-4 w-32 sm:w-36">
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

                  {/* Column 4: Requested At */}
                  <td className="py-3 px-4 w-44 sm:w-48 text-neutral-400 text-[11px] font-mono whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-neutral-500 shrink-0" />
                      <span>{formatDate(job.createdAt)}</span>
                    </div>
                  </td>

                  {/* Column 5: Action Buttons */}
                  <td className="py-3 px-4 w-32 sm:w-36 text-right whitespace-nowrap">
                    {hasMusicFile ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Tooltip content="메타데이터 수정">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditMetadata(job.musicFileId!);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-[#8590ea]" />
                            <span className="hidden sm:inline">수정</span>
                          </button>
                        </Tooltip>

                        <Tooltip content="기록 삭제">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteJob(job.id);
                            }}
                            disabled={isDeletingThis}
                            className="p-1 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteJob(job.id);
                            }}
                            disabled={isDeletingThis}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>삭제</span>
                          </button>
                        </Tooltip>
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-500 font-mono">진행 중</span>
                    )}
                  </td>
                </tr>
              </Tooltip>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
