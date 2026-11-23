import React, { useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Shield, DownloadCloud } from 'lucide-react';
import { YoutubeIcon } from '../../atoms/YoutubeIcon';
import { extractionApi } from '../../../api/extractionApi';
import type { ExtractionJobDto } from '../../../types/extraction';
import { useAuthStore } from '../../../stores/authStore';
import { useToastStore } from '../../../stores/toastStore';
import { ExtractionInputCard } from './ExtractionInputCard';
import { ExtractionActiveJobCard } from './ExtractionActiveJobCard';
import { ExtractionHistoryTable } from './ExtractionHistoryTable';

export interface ExtractionPageProps {
  onBack: () => void;
}

export const ExtractionPage: React.FC<ExtractionPageProps> = ({ onBack }) => {
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const queryClient = useQueryClient();

  const prevActiveJobIdsRef = useRef<Set<number>>(new Set());

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
            `"${finishedJob.musicFileTitle || '음원'}" 추출이 완료되어 보관함에 추가되었습니다.`,
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
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* 1. Extraction Input Form */}
        <ExtractionInputCard
          onSubmit={handleCreateExtraction}
          isLoading={createJobMutation.isPending}
        />

        {/* 2. Active Job Realtime Progress Indicator */}
        {activeJob ? <ExtractionActiveJobCard job={activeJob} /> : null}

        {/* 3. Extraction History Table */}
        <ExtractionHistoryTable jobs={jobs} onGoToLibrary={onBack} />
      </main>
    </div>
  );
};
