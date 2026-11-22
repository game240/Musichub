import React, { useState } from 'react';
import { ListMusic, Download, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { usePlayerStore } from '../../../stores/playerStore';
import { TrackArtwork } from '../library/track/TrackArtwork';
import { PlayerControls } from './PlayerControls';
import { PlayerSeekBar } from './PlayerSeekBar';
import { VolumeSlider } from '../../molecules/VolumeSlider';
import { PlayerQueueDrawer } from './queue/PlayerQueueDrawer';
import { Tooltip } from '../../atoms/Tooltip';
import { Spinner } from '../../atoms/Spinner';
import { musicApi } from '../../../api/musicApi';
import { triggerBrowserDownload } from '../../../utils/downloadFile';

export const GlobalPlayer: React.FC = () => {
  const {
    currentTrack,
    queue,
    shuffledQueue,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    playTrack,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    playNext,
    playPrev,
    removeFromQueue,
    clearQueue,
    reorderQueue,
  } = usePlayerStore();

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isDownloadingCurrent, setIsDownloadingCurrent] = useState(false);

  const handleDownloadCurrent = async () => {
    if (!currentTrack || isDownloadingCurrent) return;
    try {
      setIsDownloadingCurrent(true);
      const { downloadUrl, fileName } = await musicApi.getDownloadUrl(currentTrack.id);
      triggerBrowserDownload(downloadUrl, fileName);
    } catch (err) {
      console.error('Failed to download current track:', err);
    } finally {
      setIsDownloadingCurrent(false);
    }
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <>
      {/* Mobile Player Dock (< md) */}
      <div className="flex md:hidden flex-col w-full h-16 bg-[#08090a]/95 border-t border-white/[0.08] backdrop-blur-2xl shadow-2xl relative select-none">
        {/* Top Slim Scrub Track */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="재생 진행률"
          aria-valuemin={0}
          aria-valuemax={duration || 100}
          aria-valuenow={currentTime}
          className="w-full h-1 bg-white/[0.08] relative cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (rect.width > 0 && duration > 0) {
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              seekTo(ratio * duration);
            }
          }}
        >
          <div
            className="h-full bg-[#5e6ad2]"
            style={{
              width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
            }}
          />
        </div>

        {/* Mobile Main Row */}
        <div className="flex-1 flex items-center justify-between px-3.5 gap-2">
          {/* Metadata */}
          <div
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
            onClick={() => setIsQueueOpen(true)}
          >
            <TrackArtwork
              trackId={currentTrack.id}
              hasArtwork={currentTrack.hasArtwork}
              artworkUrl={currentTrack.artworkUrl}
              title={currentTrack.title}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-100 truncate">
                {currentTrack.title || currentTrack.fileName}
              </p>
              <p className="text-[10px] text-neutral-400 truncate">
                {currentTrack.artist || '알 수 없는 아티스트'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={playPrev}
              aria-label="이전 곡"
              className="p-1.5 text-neutral-400 hover:text-white active:scale-95 transition-all cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading}
              aria-label={isPlaying ? '일시정지' : '재생'}
              className="p-2 bg-white text-black rounded-full active:scale-90 shadow-md transition-transform cursor-pointer disabled:opacity-50 mx-0.5"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={playNext}
              aria-label="다음 곡"
              className="p-1.5 text-neutral-400 hover:text-white active:scale-95 transition-all cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={() => setIsQueueOpen((prev) => !prev)}
              aria-label="재생목록 열기"
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ml-0.5 ${
                isQueueOpen
                  ? 'text-[#8590ea] bg-[#5e6ad2]/20 border-[#5e6ad2]/30'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Player Dock (>= md) */}
      <div className="hidden md:flex w-full h-20 bg-[#08090a]/90 border-t border-white/[0.08] backdrop-blur-2xl px-6 items-center justify-between shadow-2xl">
        {/* Left: Now Playing Metadata */}
        <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
          <TrackArtwork
            trackId={currentTrack.id}
            hasArtwork={currentTrack.hasArtwork}
            artworkUrl={currentTrack.artworkUrl}
            title={currentTrack.title}
            size="md"
          />
          <div className="min-w-0 pr-2">
            <p className="text-sm font-semibold text-neutral-100 truncate">
              {currentTrack.title || currentTrack.fileName}
            </p>
            <p className="text-xs text-neutral-400 truncate">
              {currentTrack.artist || '알 수 없는 아티스트'}
            </p>
          </div>
        </div>

        {/* Center: Controls & Seek bar */}
        <div className="flex flex-col items-center gap-1 w-2/4 max-w-xl">
          <PlayerControls
            isPlaying={isPlaying}
            isLoading={isLoading}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            onTogglePlay={togglePlay}
            onPlayNext={playNext}
            onPlayPrev={playPrev}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
          />
          <PlayerSeekBar currentTime={currentTime} duration={duration} onSeek={seekTo} />
        </div>

        {/* Right: Volume & Queue Toggle */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
          <VolumeSlider
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={setVolume}
            onToggleMute={toggleMute}
          />

          <Tooltip content="현재 곡 다운로드" side="top">
            <button
              type="button"
              onClick={handleDownloadCurrent}
              disabled={isDownloadingCurrent}
              className="p-2 text-neutral-400 hover:text-white rounded-lg border border-transparent hover:bg-white/[0.05] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDownloadingCurrent ? (
                <Spinner size="sm" className="w-5 h-5 text-[#8590ea]" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>
          </Tooltip>

          <Tooltip content="재생목록" side="top">
            <button
              type="button"
              onClick={() => {
                setIsQueueOpen((prev) => !prev);
              }}
              className={`p-2 rounded-lg border transition-colors duration-150 cursor-pointer ${
                isQueueOpen
                  ? 'text-[#8590ea] bg-[#5e6ad2]/15 border-[#5e6ad2]/30'
                  : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Queue Drawer */}
      <PlayerQueueDrawer
        isOpen={isQueueOpen}
        onClose={() => {
          setIsQueueOpen(false);
        }}
        queue={isShuffle && shuffledQueue.length > 0 ? shuffledQueue : queue}
        isShuffle={isShuffle}
        currentTrackId={currentTrack.id}
        onPlayTrack={(track, index) => {
          playTrack(track, { targetIndex: index, preserveShuffle: true });
        }}
        onRemoveTrack={removeFromQueue}
        onClearQueue={clearQueue}
        onToggleShuffle={toggleShuffle}
        onReorderTrack={reorderQueue}
      />
    </>
  );
};
