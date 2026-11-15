import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Music, RefreshCw } from 'lucide-react';
import { musicApi } from '../../../api/musicApi';
import type { MusicFileDto } from '../../../types/music';
import { usePlayerStore } from '../../../stores/playerStore';
import { useAuthStore } from '../../../stores/authStore';
import { SearchInput } from '../../molecules/SearchInput';
import { Button } from '../../atoms/Button';
import { TrackTable } from './track/TrackTable';
import { UploadModal } from './upload/UploadModal';
import { ConfirmDialog } from '../../organisms/ConfirmDialog';

export const LibraryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentTrack, isPlaying, playTrack, addToQueue } = usePlayerStore();
  const { updateStorageUsage } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<MusicFileDto | null>(null);

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

  const handleDeleteConfirm = () => {
    if (trackToDelete) {
      deleteMutation.mutate(trackToDelete.id);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search titles, artists, albums..."
          />
          <button
            type="button"
            title="Refresh library"
            onClick={() => {
              refetch();
            }}
            className={`p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors ${
              isRefetching ? 'animate-spin' : ''
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'}
            </span>
          </span>

          <Button
            variant="primary"
            onClick={() => {
              setIsUploadModalOpen(true);
            }}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Music</span>
          </Button>
        </div>
      </div>

      {/* Tracks Table */}
      {isLoading ? (
        <div className="w-full h-64 flex flex-col items-center justify-center gap-3 bg-slate-900/40 rounded-2xl border border-slate-800">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading your cloud library...</p>
        </div>
      ) : (
        <TrackTable
          tracks={filteredTracks}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onAddToQueue={addToQueue}
          onDelete={setTrackToDelete}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={trackToDelete !== null}
        onClose={() => {
          setTrackToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Music File"
        message={`Are you sure you want to permanently delete "${
          trackToDelete?.title || trackToDelete?.fileName || 'this track'
        }" from Cloudflare R2? This action cannot be undone.`}
        confirmLabel="Delete Track"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
