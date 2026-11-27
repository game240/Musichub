import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Music, RefreshCw } from 'lucide-react';
import { YoutubeIcon } from '../../atoms/YoutubeIcon';
import { musicApi } from '../../../api/musicApi';
import type { MusicFileDto } from '../../../types/music';
import { usePlayerStore } from '../../../stores/playerStore';
import { useAuthStore } from '../../../stores/authStore';
import { SearchInput } from '../../molecules/SearchInput';
import { Button } from '../../atoms/Button';
import { Tooltip } from '../../atoms/Tooltip';
import { TrackTable } from './track/TrackTable';
import { UploadModal } from './upload/UploadModal';
import { EditMetadataModal } from '../../organisms/EditMetadataModal';
import { BatchActionBar } from './track/BatchActionBar';
import { BatchEditMetadataModal } from '../../organisms/BatchEditMetadataModal';
import { ConfirmDialog } from '../../organisms/ConfirmDialog';
import { triggerBrowserDownload } from '../../../utils/downloadFile';
import { downloadTracksBatch } from '../../../utils/downloadBatch';
import { toast } from '../../../stores/toastStore';

export interface LibraryPageProps {
  onNavigateExtraction?: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onNavigateExtraction }) => {
  const queryClient = useQueryClient();
  const { currentTrack, isPlaying, playTrack, addToQueue, addTracksToQueue, updateTrackInfo } =
    usePlayerStore();
  const { user, updateStorageUsage } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicFileDto | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<MusicFileDto | null>(null);
  const [downloadingTrackId, setDownloadingTrackId] = useState<number | null>(null);

  // Batch selection states
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(new Set());
  const isSelectionMode = selectedTrackIds.size > 0;
  const lastSelectedTrackIndexRef = useRef<number | null>(null);

  // Batch action states (Phase 2 & Phase 3)
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState<string | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);

  // Fetch track list
  const {
    data: pageData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['music-files'],
    queryFn: () => musicApi.listMusicFiles(0, 100),
  });

  const tracks = useMemo(() => {
    return pageData?.content || [];
  }, [pageData?.content]);

  // Filter tracks by title, artist, or album
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) {
      return tracks;
    }
    const q = searchQuery.toLowerCase();
    return tracks.filter((t) => {
      const matchTitle = t.title ? t.title.toLowerCase().includes(q) : false;
      const matchArtist = t.artist ? t.artist.toLowerCase().includes(q) : false;
      const matchAlbum = t.album ? t.album.toLowerCase().includes(q) : false;
      const matchFile = t.fileName.toLowerCase().includes(q);
      return matchTitle || matchArtist || matchAlbum || matchFile;
    });
  }, [tracks, searchQuery]);

  // Multi-select helpers
  const clearSelection = useCallback(() => {
    setSelectedTrackIds(new Set());
    lastSelectedTrackIndexRef.current = null;
  }, []);

  const toggleSelectTrack = useCallback(
    (track: MusicFileDto, event?: React.MouseEvent) => {
      const currentIndex = filteredTracks.findIndex((t) => t.id === track.id);
      if (currentIndex === -1) return;

      setSelectedTrackIds((prev) => {
        const next = new Set(prev);

        // Range selection with Shift key
        if (
          event?.shiftKey &&
          lastSelectedTrackIndexRef.current !== null &&
          lastSelectedTrackIndexRef.current !== currentIndex
        ) {
          const start = Math.min(lastSelectedTrackIndexRef.current, currentIndex);
          const end = Math.max(lastSelectedTrackIndexRef.current, currentIndex);
          for (let i = start; i <= end; i++) {
            next.add(filteredTracks[i].id);
          }
        } else {
          // Toggle individual track
          if (next.has(track.id)) {
            next.delete(track.id);
          } else {
            next.add(track.id);
          }
        }

        lastSelectedTrackIndexRef.current = currentIndex;

        return next;
      });
    },
    [filteredTracks],
  );

  const toggleSelectAll = useCallback(() => {
    if (filteredTracks.length === 0) return;

    const isAllSelected = filteredTracks.every((t) => selectedTrackIds.has(t.id));
    if (isAllSelected) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)));
    }
  }, [filteredTracks, selectedTrackIds]);

  // Keyboard shortcut handlers (Escape to clear, Ctrl/Cmd+A to select all)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input or textarea
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === 'Escape' && isSelectionMode) {
        clearSelection();
      } else if (!isInput && (e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (filteredTracks.length > 0) {
          e.preventDefault();
          setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, clearSelection, filteredTracks]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => musicApi.deleteMusicFile(id),
    onSuccess: (_, deletedId) => {
      const deletedTrack = tracks.find((t) => t.id === deletedId);
      if (deletedTrack) {
        updateStorageUsage(-deletedTrack.fileSize);
      }
      queryClient.invalidateQueries({ queryKey: ['music-files'] });
      setTrackToDelete(null);
    },
  });

  const handlePlay = (track: MusicFileDto) => {
    playTrack(track, filteredTracks);
  };

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['music-files'] });
  };

  const handleEditSuccess = (updatedTrack: MusicFileDto) => {
    queryClient.invalidateQueries({ queryKey: ['music-files'] });
    updateTrackInfo(updatedTrack);
  };

  const handleDeleteConfirm = () => {
    if (trackToDelete) {
      deleteMutation.mutate(trackToDelete.id);
    }
  };

  const handleDownload = async (track: MusicFileDto) => {
    try {
      setDownloadingTrackId(track.id);
      const { downloadUrl, fileName } = await musicApi.getDownloadUrl(track.id);
      triggerBrowserDownload(downloadUrl, fileName);
    } catch (err) {
      console.error('Failed to download track:', err);
    } finally {
      setDownloadingTrackId(null);
    }
  };

  // Selected tracks memo for batch operations
  const selectedTracks = useMemo(() => {
    return tracks.filter((t) => selectedTrackIds.has(t.id));
  }, [tracks, selectedTrackIds]);

  // Batch action handlers (Phase 2)
  const handleBatchDownload = async () => {
    if (selectedTracks.length === 0 || isBatchDownloading) return;
    setIsBatchDownloading(true);
    setBatchDownloadProgress(`1/${selectedTracks.length}`);
    try {
      await downloadTracksBatch(selectedTracks, (done, total) => {
        setBatchDownloadProgress(`${done}/${total}`);
      });
    } catch (err) {
      console.error('Batch download failed:', err);
    } finally {
      setIsBatchDownloading(false);
      setBatchDownloadProgress(null);
    }
  };

  const handleAddToQueue = (track: MusicFileDto) => {
    const { added } = addToQueue(track);
    if (!added) {
      toast.info('이미 재생목록에 있는 곡입니다.');
    } else {
      toast.success('재생목록에 추가했습니다.');
    }
  };

  const handleBatchAddToQueue = () => {
    if (selectedTracks.length === 0) return;
    const { addedCount, duplicateCount } = addTracksToQueue(selectedTracks);
    clearSelection();

    if (addedCount === 0 && duplicateCount > 0) {
      toast.info('선택한 곡이 모두 이미 재생목록에 있습니다.');
    } else if (duplicateCount > 0) {
      toast.info(
        `이미 있는 ${duplicateCount}곡을 제외하고 ${addedCount}곡을 재생목록에 추가했습니다.`,
      );
    } else if (addedCount > 0) {
      toast.success(`${addedCount}곡을 재생목록에 추가했습니다.`);
    }
  };

  const handleBatchDeleteConfirm = async () => {
    if (selectedTracks.length === 0 || isBatchDeleting) return;
    setIsBatchDeleting(true);
    try {
      await Promise.allSettled(selectedTracks.map((t) => musicApi.deleteMusicFile(t.id)));
      const deletedBytes = selectedTracks.reduce((sum, t) => sum + t.fileSize, 0);
      updateStorageUsage(-deletedBytes);
      queryClient.invalidateQueries({ queryKey: ['music-files'] });
      clearSelection();
      setIsBatchDeleteModalOpen(false);
    } catch (err) {
      console.error('Batch delete failed:', err);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="곡 제목, 아티스트, 앨범 검색..."
            className="flex-1 max-w-full sm:max-w-md"
          />
          <Tooltip content="보관함 새로고침" side="bottom">
            <button
              type="button"
              onClick={() => {
                refetch();
              }}
              className={`p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0 ${
                isRefetching ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 justify-between sm:justify-end shrink-0">
          <span className="text-xs text-neutral-400 border border-white/10 bg-white/[0.03] px-2.5 py-1.5 rounded-md flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>총 {filteredTracks.length}곡</span>
          </span>

          {/* YouTube Extraction Button for ADMIN / DOWNLOADER */}
          {(user?.role === 'ADMIN' || user?.role === 'DOWNLOADER') && onNavigateExtraction ? (
            <Button
              variant="secondary"
              onClick={onNavigateExtraction}
              className="flex items-center gap-1.5 border-white/[0.1] hover:border-red-500/30 hover:bg-red-500/10 text-neutral-200 hover:text-white"
            >
              <YoutubeIcon className="w-4 h-4 text-red-500" />
              <span>YouTube 추출</span>
            </Button>
          ) : null}

          <Button
            variant="primary"
            onClick={() => {
              setIsUploadModalOpen(true);
            }}
          >
            <UploadCloud className="w-4 h-4" />
            <span>음원 업로드</span>
          </Button>
        </div>
      </div>

      {/* Tracks Table */}
      {isLoading ? (
        <div className="w-full h-64 flex flex-col items-center justify-center gap-3 bg-white/[0.015] rounded-2xl border border-white/[0.08]">
          <div className="w-7 h-7 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-400">보관함 음원을 불러오는 중...</p>
        </div>
      ) : (
        <TrackTable
          tracks={filteredTracks}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          downloadingTrackId={downloadingTrackId}
          selectedTrackIds={selectedTrackIds}
          isSelectionMode={isSelectionMode}
          onPlay={handlePlay}
          onAddToQueue={handleAddToQueue}
          onEdit={setEditingTrack}
          onDelete={setTrackToDelete}
          onDownload={handleDownload}
          onUploadClick={() => {
            setIsUploadModalOpen(true);
          }}
          onToggleSelect={toggleSelectTrack}
          onToggleSelectAll={toggleSelectAll}
          isFiltered={searchQuery.trim().length > 0}
        />
      )}

      {/* Floating Batch Action Bar */}
      <BatchActionBar
        isOpen={selectedTrackIds.size > 0}
        selectedCount={selectedTrackIds.size}
        isDownloading={isBatchDownloading}
        downloadProgressText={batchDownloadProgress}
        onDownload={handleBatchDownload}
        onAddToQueue={handleBatchAddToQueue}
        onEditMetadata={() => {
          setIsBatchEditModalOpen(true);
        }}
        onDelete={() => {
          setIsBatchDeleteModalOpen(true);
        }}
        onClearSelection={clearSelection}
      />

      {/* Batch Edit Metadata Modal */}
      <BatchEditMetadataModal
        isOpen={isBatchEditModalOpen}
        onClose={() => {
          setIsBatchEditModalOpen(false);
        }}
        tracks={selectedTracks}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['music-files'] });
          clearSelection();
        }}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
        }}
        onSuccess={handleUploadSuccess}
      />

      {/* Edit Metadata Modal */}
      <EditMetadataModal
        isOpen={editingTrack !== null}
        onClose={() => {
          setEditingTrack(null);
        }}
        track={editingTrack}
        onSuccess={handleEditSuccess}
      />

      {/* Single Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={trackToDelete !== null}
        onClose={() => {
          setTrackToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="음원 삭제"
        message={`"${
          trackToDelete?.title || trackToDelete?.fileName || '선택한 곡'
        }" 음원을 보관함에서 삭제하시겠습니까? 클라우드 저장소에서도 즉시 영구 삭제되며 복구할 수 없습니다.`}
        confirmLabel="삭제하기"
        isLoading={deleteMutation.isPending}
      />

      {/* Batch Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isBatchDeleteModalOpen}
        onClose={() => {
          setIsBatchDeleteModalOpen(false);
        }}
        onConfirm={handleBatchDeleteConfirm}
        title="음원 일괄 삭제"
        message={`선택한 ${selectedTracks.length}개의 음원을 보관함에서 영구 삭제하시겠습니까? 클라우드 저장소에서도 즉시 영구 삭제되며 복구할 수 없습니다.`}
        confirmLabel="일괄 삭제하기"
        isLoading={isBatchDeleting}
      />
    </div>
  );
};
