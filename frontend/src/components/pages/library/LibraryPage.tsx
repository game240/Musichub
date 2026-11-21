import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Music, RefreshCw } from 'lucide-react';
import { musicApi } from '../../../api/musicApi';
import type { MusicFileDto } from '../../../types/music';
import { usePlayerStore } from '../../../stores/playerStore';
import { useAuthStore } from '../../../stores/authStore';
import { SearchInput } from '../../molecules/SearchInput';
import { Button } from '../../atoms/Button';
import { Tooltip } from '../../atoms/Tooltip';
import { TrackTable } from './track/TrackTable';
import { UploadModal } from './upload/UploadModal';
import { EditMetadataModal } from './track/EditMetadataModal';
import { ConfirmDialog } from '../../organisms/ConfirmDialog';
import { triggerBrowserDownload } from '../../../utils/downloadFile';

export const LibraryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentTrack, isPlaying, playTrack, addToQueue, updateTrackInfo } = usePlayerStore();
  const { updateStorageUsage } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicFileDto | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<MusicFileDto | null>(null);
  const [downloadingTrackId, setDownloadingTrackId] = useState<number | null>(null);

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

  return (
    <div className="flex flex-col gap-5">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="곡 제목, 아티스트, 앨범 검색..."
          />
          <Tooltip content="보관함 새로고침" side="bottom">
            <button
              type="button"
              onClick={() => {
                refetch();
              }}
              className={`p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer ${
                isRefetching ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <span className="text-xs text-neutral-400 border border-white/10 bg-white/[0.03] px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>총 {filteredTracks.length}곡</span>
          </span>

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
          onPlay={handlePlay}
          onAddToQueue={addToQueue}
          onEdit={setEditingTrack}
          onDelete={setTrackToDelete}
          onDownload={handleDownload}
          onUploadClick={() => {
            setIsUploadModalOpen(true);
          }}
          isFiltered={searchQuery.trim().length > 0}
        />
      )}

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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={trackToDelete !== null}
        onClose={() => {
          setTrackToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="음원 삭제"
        message={`"${
          trackToDelete?.title || trackToDelete?.fileName || '선택한 곡'
        }" 음원을 보관함에서 삭제하시겠습니까? 클라우드 스토리지(R2)에서도 즉시 영구 삭제되며 복구할 수 없습니다.`}
        confirmLabel="삭제하기"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
