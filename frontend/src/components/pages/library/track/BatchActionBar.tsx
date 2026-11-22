import React from 'react';
import { Download, ListPlus, Pencil, Trash2, X } from 'lucide-react';
import { Spinner } from '../../../atoms/Spinner';
import { Tooltip } from '../../../atoms/Tooltip';
import { cn } from '../../../../utils/cn';

export interface BatchActionBarProps {
  selectedCount: number;
  isOpen: boolean;
  isDownloading?: boolean;
  downloadProgressText?: string | null;
  onDownload: () => void;
  onAddToQueue: () => void;
  onEditMetadata: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  isOpen,
  isDownloading = false,
  downloadProgressText = null,
  onDownload,
  onAddToQueue,
  onEditMetadata,
  onDelete,
  onClearSelection,
}) => {
  if (!isOpen || selectedCount === 0) {
    return null;
  }

  return (
    <aside
      aria-label="선택한 음원 일괄 관리"
      className={cn(
        'fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-40',
        'max-w-[calc(100vw-24px)] w-max',
        'bg-[#0f1011]/95 border border-white/[0.14] backdrop-blur-xl shadow-2xl shadow-black/90',
        'rounded-full px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1.5 sm:gap-2.5',
        'transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 select-none',
      )}
    >
      {/* Selected Count Indicator */}
      <div className="flex items-center gap-1.5 pr-2 border-r border-white/10 shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#5e6ad2] animate-pulse" />
        <span className="text-xs font-semibold text-white whitespace-nowrap">
          {selectedCount}
          <span className="hidden sm:inline font-normal text-neutral-300">개 선택됨</span>
        </span>
      </div>

      {/* Action: Batch Download (Priority 1) */}
      <Tooltip content={isDownloading ? '다운로드 진행 중' : '선택한 곡 일괄 다운로드'} side="top">
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
            'bg-[#5e6ad2] hover:bg-[#6f7cf4] text-white shadow-sm shadow-[#5e6ad2]/20 disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isDownloading ? (
            <>
              <Spinner size="sm" />
              <span className="text-[11px] whitespace-nowrap">
                {downloadProgressText || '다운로드 중...'}
              </span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline whitespace-nowrap">다운로드</span>
            </>
          )}
        </button>
      </Tooltip>

      {/* Action: Batch Add to Queue */}
      <Tooltip content="선택한 곡 대기열에 추가" side="top">
        <button
          type="button"
          onClick={onAddToQueue}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
        >
          <ListPlus className="w-3.5 h-3.5 text-neutral-300" />
          <span className="hidden md:inline whitespace-nowrap">대기열 추가</span>
        </button>
      </Tooltip>

      {/* Action: Batch Edit Metadata */}
      <Tooltip content="선택한 곡 정보 일괄 수정" side="top">
        <button
          type="button"
          onClick={onEditMetadata}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
        >
          <Pencil className="w-3.5 h-3.5 text-neutral-300" />
          <span className="hidden md:inline whitespace-nowrap">정보 일괄 수정</span>
        </button>
      </Tooltip>

      {/* Action: Batch Delete */}
      <Tooltip content="선택한 곡 일괄 삭제" side="top">
        <button
          type="button"
          onClick={onDelete}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline whitespace-nowrap">삭제</span>
        </button>
      </Tooltip>

      {/* Clear Selection / Close */}
      <div className="pl-1 border-l border-white/10 shrink-0">
        <Tooltip content="선택 해제 (ESC)" side="top">
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="선택 해제"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
};
