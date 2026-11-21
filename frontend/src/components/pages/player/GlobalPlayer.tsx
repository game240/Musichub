import React, { useState } from 'react';
import { ListMusic } from 'lucide-react';
import { usePlayerStore } from '../../../stores/playerStore';
import { TrackArtwork } from '../library/track/TrackArtwork';
import { PlayerControls } from './PlayerControls';
import { PlayerSeekBar } from './PlayerSeekBar';
import { VolumeSlider } from '../../molecules/VolumeSlider';
import { PlayerQueueDrawer } from './queue/PlayerQueueDrawer';
import { Tooltip } from '../../atoms/Tooltip';

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
  } = usePlayerStore();

  const [isQueueOpen, setIsQueueOpen] = useState(false);

  if (!currentTrack) {
    return null;
  }

  return (
    <>
      <div className="w-full h-20 bg-[#08090a]/90 border-t border-white/[0.08] backdrop-blur-2xl px-6 flex items-center justify-between shadow-2xl">
        {/* Left: Now Playing Metadata */}
        <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
          <TrackArtwork
            trackId={currentTrack.id}
            hasArtwork={currentTrack.hasArtwork}
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

          <Tooltip content="재생목록" side="top">
            <button
              type="button"
              onClick={() => {
                setIsQueueOpen((prev) => !prev);
              }}
              className={`p-2 rounded-lg transition-all duration-150 cursor-pointer ${
                isQueueOpen
                  ? 'text-[#8590ea] bg-[#5e6ad2]/15 border border-[#5e6ad2]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.05]'
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
        onPlayTrack={playTrack}
        onRemoveTrack={removeFromQueue}
        onClearQueue={clearQueue}
      />
    </>
  );
};
