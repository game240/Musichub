import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Shield, DownloadCloud } from 'lucide-react';
import { YoutubeIcon } from '../../atoms/YoutubeIcon';
import { extractionApi } from '../../../api/extractionApi';
import { musicApi } from '../../../api/musicApi';
import type { ExtractionJobDto } from '../../../types/extraction';
import type { MusicFileDto } from '../../../types/music';
import { useAuthStore } from '../../../stores/authStore';
import { useToastStore } from '../../../stores/toastStore';
import { usePlayerStore } from '../../../stores/playerStore';
import { ExtractionInputCard } from './ExtractionInputCard';
import { ExtractionActiveJobCard } from './ExtractionActiveJobCard';
import { ExtractionHistoryTable } from './ExtractionHistoryTable';
import { ExtractionBatchActionBar } from './ExtractionBatchActionBar';
import { EditMetadataModal } from '../../organisms/EditMetadataModal';
import { BatchEditMetadataModal } from '../../organisms/BatchEditMetadataModal';

export interface ExtractionPageProps {
  onBack: () => void;
}

interface PendingDeletion {
  timerId: ReturnType<typeof setTimeout>;
  commit: () => Promise<void>;
  rollback: () => void;
}

export const ExtractionPage: React.FC<ExtractionPageProps> = ({ onBack }) => {
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const updateTrackInfo = usePlayerStore((state) => state.updateTrackInfo);
  const queryClient = useQueryClient();

  const [editingTrack, setEditingTrack] = useState<MusicFileDto | null>(null);
  const [focusedJobId, setFocusedJobId] = useState<number | null>(null);
  const prevActiveJobIdsRef = useRef<Set<number>>(new Set());

  // Batch selection states
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [isFetchingBatchTracks, setIsFetchingBatchTracks] = useState(false);
  const [batchEditTracks, setBatchEditTracks] = useState<MusicFileDto[]>([]);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);

  // Pending deletions map for undo capability (keyed by action identifier)
  const pendingDeletionsRef = useRef<Map<string, PendingDeletion>>(new Map());

  // 컴포넌트 언마운트 및 페이지 이탈(beforeunload) 시 지연 중인 삭제 요청을 즉시 서버에 커밋
  useEffect(() => {
    const flushAllPendingDeletions = () => {
      pendingDeletionsRef.current.forEach(({ timerId, commit }) => {
        clearTimeout(timerId);
        commit();
      });
      pendingDeletionsRef.current.clear();
    };

    window.addEventListener('beforeunload', flushAllPendingDeletions);

    return () => {
      window.removeEventListener('beforeunload', flushAllPendingDeletions);
      flushAllPendingDeletions();
    };
  }, []);

  // 1. 추출 작업 목록 조회 (스마트 조건부 2초 폴링)
  const {
    data: jobs = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['extractions'],
    queryFn: () => extractionApi.listMyExtractions(),
    refetchInterval: (query) => {
      const data = query.state.data as ExtractionJobDto[] | undefined;
      const hasActive =
        data?.some((j) =>
          ['PENDING', 'DOWNLOADING', 'CONVERTING', 'UPLOADING'].includes(j.status)
        ) ?? false;
      return hasActive ? 2000 : false;
    },
    refetchOnWindowFocus: false,
  });

  // 2. 활성 작업 및 카드에 표시할 작업 감지
  const activeJobs = jobs.filter((j) =>
    ['PENDING', 'DOWNLOADING', 'CONVERTING', 'UPLOADING'].includes(j.status)
  );

  const displayedJob =
    (focusedJobId ? jobs.find((j) => j.id === focusedJobId) : null) ||
    activeJobs[0] ||
    null;

  // 3. 작업 완료 감지 시 토스트 알림 및 보관함 캐시 무효화
  useEffect(() => {
    const currentActiveIds = new Set(
      jobs
        .filter((j) => ['PENDING', 'DOWNLOADING', 'CONVERTING', 'UPLOADING'].includes(j.status))
        .map((j) => j.id)
    );

    // 이전에는 active였으나 지금은 active가 아닌 작업들 확인
    for (const prevId of prevActiveJobIdsRef.current) {
      if (!currentActiveIds.has(prevId)) {
        const finishedJob = jobs.find((j) => j.id === prevId);
        if (finishedJob?.status === 'COMPLETED') {
          addToast(
            `"${finishedJob.musicFileTitle || '음원'}" 추출이 완료되었습니다. 하단 히스토리에서 [수정]을 눌러 곡 정보를 다듬을 수 있습니다.`,
            'success'
          );
          queryClient.invalidateQueries({ queryKey: ['music-files'] });
          queryClient.invalidateQueries({ queryKey: ['user-me'] });
        } else if (finishedJob?.status === 'FAILED') {
          addToast(
            `음원 추출에 실패했습니다: ${finishedJob.errorMessage || '알 수 없는 오류'}`,
            'error'
          );
        }
      }
    }

    prevActiveJobIdsRef.current = currentActiveIds;
  }, [jobs, addToast, queryClient]);

  // Escape 키로 선택 모드 해제
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedJobIds.size > 0 && !isBatchEditModalOpen && !editingTrack) {
        setSelectedJobIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedJobIds.size, isBatchEditModalOpen, editingTrack]);

  // Multi-select helpers
  const clearSelection = useCallback(() => {
    setSelectedJobIds(new Set());
  }, []);

  const toggleSelectJob = useCallback((jobId: number) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const selectableJobs = jobs.filter(
      (j) => j.status === 'COMPLETED' && j.musicFileId !== null
    );
    if (selectableJobs.length === 0) return;

    setSelectedJobIds((prev) => {
      const isAllSelected = selectableJobs.every((j) => prev.has(j.id));
      if (isAllSelected) {
        return new Set();
      }
      return new Set(selectableJobs.map((j) => j.id));
    });
  }, [jobs]);

  // 4. 추출 생성 뮤테이션
  const createJobMutation = useMutation({
    mutationFn: (sourceUrl: string) => extractionApi.requestExtraction(sourceUrl),
    onSuccess: (newJob) => {
      addToast('음원 추출 작업이 등록되었습니다. 잠시 기다려주세요.', 'info');
      setFocusedJobId(newJob.id);
      queryClient.setQueryData<ExtractionJobDto[]>(['extractions'], (old = []) => [
        newJob,
        ...old,
      ]);
      refetch();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '추출 작업 생성에 실패했습니다.';
      addToast(message, 'error');
    },
  });

  const handleCreateExtraction = async (url: string) => {
    await createJobMutation.mutateAsync(url);
  };

  // 5. 추출 중단(취소) 뮤테이션
  const cancelJobMutation = useMutation({
    mutationFn: (jobId: number) => extractionApi.cancelExtraction(jobId),
    onSuccess: (cancelledJob) => {
      addToast('음원 추출 작업이 중단(취소)되었습니다.', 'info');
      queryClient.setQueryData<ExtractionJobDto[]>(['extractions'], (old = []) =>
        old.map((j) => (j.id === cancelledJob.id ? cancelledJob : j))
      );
      refetch();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '작업 취소에 실패했습니다.';
      addToast(message, 'error');
    },
  });

  const handleCancelExtraction = (jobId: number) => {
    cancelJobMutation.mutate(jobId);
  };

  // 지연 삭제 등록 헬퍼 (5초 동안 유지되는 되돌리기 토스트 제공)
  const registerPendingDeletion = (
    key: string,
    message: string,
    commitFn: () => Promise<void>,
    rollbackFn: () => void,
  ) => {
    // 동일 키의 이전 대기 작업이 있다면 즉시 커밋
    const existing = pendingDeletionsRef.current.get(key);
    if (existing) {
      clearTimeout(existing.timerId);
      existing.commit();
      pendingDeletionsRef.current.delete(key);
    }

    const timerId = setTimeout(async () => {
      pendingDeletionsRef.current.delete(key);
      try {
        await commitFn();
      } catch (err) {
        console.error('Failed to commit deletion:', err);
      }
    }, 5000);

    const rollback = () => {
      clearTimeout(timerId);
      pendingDeletionsRef.current.delete(key);
      rollbackFn();
    };

    pendingDeletionsRef.current.set(key, { timerId, commit: commitFn, rollback });

    addToast(message, 'info', 5000, {
      label: '되돌리기',
      onClick: rollback,
    });
  };

  // 6. 단건 히스토리 삭제 (5초 되돌리기 지원)
  const handleDeleteJob = (jobId: number) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    // 선택 해제
    setSelectedJobIds((prev) => {
      if (!prev.has(jobId)) return prev;
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });

    // 즉시 UI 캐시에서 낙관적 제거
    queryClient.setQueryData<ExtractionJobDto[]>(['extractions'], (old = []) =>
      old.filter((j) => j.id !== jobId)
    );

    const key = `job-${jobId}`;
    const displayTitle = targetJob.musicFileTitle || targetJob.sourceUrl || '음원';

    registerPendingDeletion(
      key,
      `"${displayTitle}" 추출 기록이 삭제되었습니다.`,
      async () => {
        await extractionApi.deleteExtraction(jobId);
      },
      () => {
        queryClient.setQueryData<ExtractionJobDto[]>(['extractions'], (old = []) => {
          if (old.some((j) => j.id === targetJob.id)) return old;
          return [...old, targetJob].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        addToast(`"${displayTitle}" 삭제가 취소되었습니다.`, 'info');
      }
    );
  };

  // 7. 선택한 히스토리 일괄 삭제 (5초 되돌리기 지원)
  const handleDeleteSelectedJobs = () => {
    if (selectedJobIds.size === 0) return;
    const targetJobs = jobs.filter((j) => selectedJobIds.has(j.id));
    if (targetJobs.length === 0) return;

    const targetIds = new Set(targetJobs.map((j) => j.id));

    // 선택 해제
    clearSelection();

    // 즉시 UI 캐시에서 선택된 작업 제거
    queryClient.setQueryData<ExtractionJobDto[]>(['extractions'], (old = []) =>
      old.filter((j) => !targetIds.has(j.id))
    );

    const key = `batch-${Date.now()}`;
    registerPendingDeletion(
      key,
      `${targetJobs.length}건의 추출 기록이 삭제되었습니다.`,
      async () => {
        await Promise.all(targetJobs.map((j) => extractionApi.deleteExtraction(j.id)));
      },
      () => {
        queryClient.setQueryData<ExtractionJobDto[]>(['extractions'], (old = []) => {
          const existingIds = new Set(old.map((j) => j.id));
          const toRestore = targetJobs.filter((j) => !existingIds.has(j.id));
          return [...old, ...toRestore].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        addToast(`${targetJobs.length}건의 삭제가 취소되었습니다.`, 'info');
      }
    );
  };

  // 9. 단건 메타데이터 수정 열기 및 완료 핸들러
  const handleOpenEditMetadata = async (musicFileId: number) => {
    try {
      const track = await musicApi.getMusicFile(musicFileId);
      setEditingTrack(track);
    } catch {
      addToast('음원 정보를 불러오지 못했습니다.', 'error');
    }
  };

  const handleEditSuccess = (updatedTrack: MusicFileDto) => {
    queryClient.invalidateQueries({ queryKey: ['music-files'] });
    queryClient.invalidateQueries({ queryKey: ['extractions'] });
    updateTrackInfo(updatedTrack);
    setEditingTrack(null);
    addToast(`"${updatedTrack.title}" 메타데이터가 성공적으로 저장되었습니다.`, 'success');
  };

  // 10. 다건 메타데이터 일괄 수정 열기 및 완료 핸들러
  const handleOpenBatchEdit = async () => {
    const targetJobs = jobs.filter(
      (j) => selectedJobIds.has(j.id) && j.musicFileId !== null
    );
    if (targetJobs.length === 0) {
      addToast('선택된 완료 음원이 없습니다.', 'info');
      return;
    }

    setIsFetchingBatchTracks(true);
    try {
      const tracks = await Promise.all(
        targetJobs.map((j) => musicApi.getMusicFile(j.musicFileId!))
      );
      setBatchEditTracks(tracks);
      setIsBatchEditModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch tracks for batch edit:', err);
      addToast('선택한 음원 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setIsFetchingBatchTracks(false);
    }
  };

  const handleBatchEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['music-files'] });
    queryClient.invalidateQueries({ queryKey: ['extractions'] });
    addToast('선택한 음원들의 정보가 성공적으로 일괄 수정되었습니다.', 'success');
    clearSelection();
    setIsBatchEditModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-neutral-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#08090a]/80 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">라이브러리로 돌아가기</span>
          </button>

          <div className="h-4 w-[1px] bg-white/[0.08] hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
              <YoutubeIcon className="w-4 h-4" />
            </div>
            <h1 className="text-sm font-semibold text-neutral-100">YouTube 음원 추출</h1>
            {user?.role === 'ADMIN' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                <Shield className="w-3 h-3" />
                ADMIN
              </span>
            ) : user?.role === 'DOWNLOADER' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <DownloadCloud className="w-3 h-3" />
                DOWNLOADER
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          title="새로고침"
          className="p-2 rounded-lg text-neutral-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-28 flex flex-col gap-4">
        {/* 1. Extraction Input Form */}
        <ExtractionInputCard
          onSubmit={handleCreateExtraction}
          isLoading={createJobMutation.isPending}
        />

        {/* 2. Active / Inspected Job Realtime Progress Indicator */}
        {displayedJob ? (
          <ExtractionActiveJobCard
            key={displayedJob.id}
            job={displayedJob}
            totalActiveCount={activeJobs.length}
            onCancel={handleCancelExtraction}
            onClose={() => setFocusedJobId(null)}
            isCancelling={cancelJobMutation.isPending}
          />
        ) : null}

        {/* 3. Extraction History Table */}
        <ExtractionHistoryTable
          jobs={jobs}
          selectedJobIds={selectedJobIds}
          focusedJobId={displayedJob?.id ?? null}
          onFocusJob={(jobId) => setFocusedJobId((prev) => (prev === jobId ? null : jobId))}
          onToggleSelectJob={toggleSelectJob}
          onToggleSelectAll={toggleSelectAll}
          onBatchEdit={handleOpenBatchEdit}
          isBatchLoading={isFetchingBatchTracks}
          onGoToLibrary={onBack}
          onEditMetadata={handleOpenEditMetadata}
          onDeleteJob={handleDeleteJob}
          onDeleteSelected={handleDeleteSelectedJobs}
        />
      </main>

      {/* 4. Floating Batch Action Bar */}
      <ExtractionBatchActionBar
        isOpen={selectedJobIds.size > 0}
        selectedCount={selectedJobIds.size}
        isLoading={isFetchingBatchTracks}
        onEditMetadata={handleOpenBatchEdit}
        onDeleteSelected={handleDeleteSelectedJobs}
        onClearSelection={clearSelection}
      />

      {/* 5. Batch Edit Metadata Modal */}
      <BatchEditMetadataModal
        isOpen={isBatchEditModalOpen}
        onClose={() => setIsBatchEditModalOpen(false)}
        tracks={batchEditTracks}
        onSuccess={handleBatchEditSuccess}
      />

      {/* 6. Single Edit Metadata Modal */}
      <EditMetadataModal
        isOpen={editingTrack !== null}
        onClose={() => setEditingTrack(null)}
        track={editingTrack}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};
