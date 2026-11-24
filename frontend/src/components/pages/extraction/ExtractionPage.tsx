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

export const ExtractionPage: React.FC<ExtractionPageProps> = ({ onBack }) => {
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const updateTrackInfo = usePlayerStore((state) => state.updateTrackInfo);
  const queryClient = useQueryClient();

  const [editingTrack, setEditingTrack] = useState<MusicFileDto | null>(null);
  const prevActiveJobIdsRef = useRef<Set<number>>(new Set());

  // Batch selection states
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [isFetchingBatchTracks, setIsFetchingBatchTracks] = useState(false);
  const [batchEditTracks, setBatchEditTracks] = useState<MusicFileDto[]>([]);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [isBatchDeletingJobs, setIsBatchDeletingJobs] = useState(false);

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

  // 2. 활성 작업 감지
  const activeJob = jobs.find((j) =>
    ['PENDING', 'DOWNLOADING', 'CONVERTING', 'UPLOADING'].includes(j.status)
  );

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

  // 6. 단건 히스토리 삭제 뮤테이션
  const deleteJobMutation = useMutation({
    mutationFn: (jobId: number) => extractionApi.deleteExtraction(jobId),
    onSuccess: (_, jobId) => {
      addToast('추출 작업 기록이 삭제되었습니다.', 'info');
      queryClient.setQueryData<ExtractionJobDto[]>(['extractions'], (old = []) =>
        old.filter((j) => j.id !== jobId)
      );
      setSelectedJobIds((prev) => {
        if (!prev.has(jobId)) return prev;
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '기록 삭제에 실패했습니다.';
      addToast(message, 'error');
    },
  });

  const handleDeleteJob = (jobId: number) => {
    deleteJobMutation.mutate(jobId);
  };

  // 7. 종료된 히스토리 전체 일괄 삭제 뮤테이션
  const clearHistoryMutation = useMutation({
    mutationFn: () => extractionApi.clearExtractionHistory(),
    onSuccess: (data) => {
      addToast(
        data.deletedCount > 0
          ? `${data.deletedCount}건의 추출 히스토리가 삭제되었습니다.`
          : '삭제할 추출 내역이 없습니다.',
        'info'
      );
      queryClient.setQueryData<ExtractionJobDto[]>(['extractions'], (old = []) =>
        old.filter((j) =>
          ['PENDING', 'DOWNLOADING', 'CONVERTING', 'UPLOADING'].includes(j.status)
        )
      );
      clearSelection();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '기록 전체 삭제에 실패했습니다.';
      addToast(message, 'error');
    },
  });

  const handleClearHistory = () => {
    if (
      window.confirm(
        '완료 및 종료된 추출 히스토리를 모두 삭제하시겠습니까?\n(보관함에 이미 저장된 음원 파일은 안전하게 유지됩니다.)'
      )
    ) {
      clearHistoryMutation.mutate();
    }
  };

  // 8. 선택한 히스토리 일괄 삭제 핸들러
  const handleDeleteSelectedJobs = async () => {
    if (selectedJobIds.size === 0 || isBatchDeletingJobs) return;
    if (
      !window.confirm(
        `선택한 ${selectedJobIds.size}건의 추출 히스토리를 삭제하시겠습니까?\n(보관함의 음원 파일은 안전하게 유지됩니다.)`
      )
    ) {
      return;
    }

    setIsBatchDeletingJobs(true);
    const idsToDelete = Array.from(selectedJobIds);
    try {
      await Promise.all(idsToDelete.map((id) => extractionApi.deleteExtraction(id)));
      addToast(`${idsToDelete.length}건의 추출 기록이 삭제되었습니다.`, 'info');
      queryClient.setQueryData<ExtractionJobDto[]>(['extractions'], (old = []) =>
        old.filter((j) => !selectedJobIds.has(j.id))
      );
      clearSelection();
    } catch (err) {
      console.error('Failed to delete selected extraction jobs:', err);
      addToast('선택한 추출 기록 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsBatchDeletingJobs(false);
    }
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
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-28 flex flex-col gap-6">
        {/* 1. Extraction Input Form */}
        <ExtractionInputCard
          onSubmit={handleCreateExtraction}
          isLoading={createJobMutation.isPending}
        />

        {/* 2. Active Job Realtime Progress Indicator */}
        {activeJob ? (
          <ExtractionActiveJobCard
            job={activeJob}
            onCancel={handleCancelExtraction}
            isCancelling={cancelJobMutation.isPending}
          />
        ) : null}

        {/* 3. Extraction History Table */}
        <ExtractionHistoryTable
          jobs={jobs}
          selectedJobIds={selectedJobIds}
          onToggleSelectJob={toggleSelectJob}
          onToggleSelectAll={toggleSelectAll}
          onBatchEdit={handleOpenBatchEdit}
          isBatchLoading={isFetchingBatchTracks}
          onClearSelection={clearSelection}
          onGoToLibrary={onBack}
          onEditMetadata={handleOpenEditMetadata}
          onDeleteJob={handleDeleteJob}
          onClearHistory={handleClearHistory}
          isClearing={clearHistoryMutation.isPending}
          deletingJobId={deleteJobMutation.variables ?? null}
        />
      </main>

      {/* 4. Floating Batch Action Bar */}
      <ExtractionBatchActionBar
        isOpen={selectedJobIds.size > 0}
        selectedCount={selectedJobIds.size}
        isLoading={isFetchingBatchTracks || isBatchDeletingJobs}
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
