import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useTagSyncStore } from '../../stores/tagSyncStore';
import { Spinner } from '../atoms/Spinner';

export const FloatingTagSyncWidget: React.FC = () => {
  const { tasks, removeTask } = useTagSyncStore();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="클라우드 동기화 상태"
      className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none"
    >
      {tasks.map((task) => {
        const isSyncing = task.status === 'syncing';
        const isCompleted = task.status === 'completed';
        const isError = task.status === 'error';

        return (
          <div
            key={task.id}
            className="pointer-events-auto bg-[#0f1011]/95 border border-white/[0.1] backdrop-blur-xl rounded-xl p-3 shadow-2xl flex items-center gap-3 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
          >
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {isSyncing && <Spinner size="sm" />}
              {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isError && <AlertCircle className="w-4 h-4 text-red-400" />}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-neutral-200 truncate">
                {task.title || '음원 파일'}
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                {isSyncing && 'R2 오디오 파일 태그 동기화 중...'}
                {isCompleted && '클라우드 파일 태그 동기화 완료'}
                {isError && (task.errorMessage || '동기화 중 오류 발생')}
              </p>
            </div>

            {/* Close button for completed or error */}
            {!isSyncing && (
              <button
                type="button"
                onClick={() => removeTask(task.id)}
                className="flex-shrink-0 p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </aside>
  );
};
