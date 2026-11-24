import React from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { Spinner } from '../../atoms/Spinner';
import { Tooltip } from '../../atoms/Tooltip';
import { cn } from '../../../utils/cn';

export interface ExtractionBatchActionBarProps {
  selectedCount: number;
  isOpen: boolean;
  isLoading?: boolean;
  onEditMetadata: () => void;
  onDeleteSelected?: () => void;
  onClearSelection: () => void;
}

export const ExtractionBatchActionBar: React.FC<ExtractionBatchActionBarProps> = ({
  selectedCount,
  isOpen,
  isLoading = false,
  onEditMetadata,
  onDeleteSelected,
  onClearSelection,
}) => {
  const isVisible = isOpen && selectedCount > 0;

  return (
    <aside
      aria-label="선택한 음원 일괄 관리"
      className={cn(
        'fixed bottom-6 sm:bottom-8 left-0 right-0 mx-auto z-40',
        'max-w-[calc(100vw-24px)] w-fit',
        'bg-[#0f1011]/95 border border-white/[0.14] backdrop-blur-xl shadow-2xl shadow-black/90',
        'rounded-full px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 select-none',
        'transition-all duration-200 ease-out',
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-3 pointer-events-none',
      )}
    >
      {/* Selected Count Indicator */}
      <div className="flex items-center gap-1.5 pr-2 border-r border-white/10 shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#5e6ad2]" />
        <span className="text-xs font-semibold text-white whitespace-nowrap">
          {selectedCount}
          <span className="hidden sm:inline font-normal text-neutral-300">개 선택됨</span>
        </span>
      </div>

      {/* Action: Batch Edit Metadata */}
      <Tooltip content="선택한 곡 메타데이터 일괄 수정" side="top">
        <button
          type="button"
          onClick={onEditMetadata}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
            'bg-[#5e6ad2] hover:bg-[#6f7cf4] text-white shadow-sm shadow-[#5e6ad2]/20 disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isLoading ? (
            <>
              <Spinner size="sm" />
              <span className="text-[11px] whitespace-nowrap">불러오는 중...</span>
            </>
          ) : (
            <>
              <Pencil className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">일괄 수정</span>
            </>
          )}
        </button>
      </Tooltip>

      {/* Action: Batch Delete Selected History Records */}
      {onDeleteSelected ? (
        <Tooltip content="선택한 추출 기록 삭제 (보관함 음원은 유지)" side="top">
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline whitespace-nowrap">기록 삭제</span>
          </button>
        </Tooltip>
      ) : null}

      {/* Clear Selection / Close */}
      <div className="pl-1 border-l border-white/10 shrink-0">
        <Tooltip content="선택 모드 나가기 (ESC)" side="top">
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="선택 모드 나가기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
};
