import React, { useState } from 'react';
import { ListMusic } from 'lucide-react';
import { usePlayerStore } from '../../../stores/playerStore';
import { TrackArtwork } from '../library/track/TrackArtwork';
import { PlayerControls } from './PlayerControls';
import { PlayerSeekBar } from './PlayerSeekBar';
import { VolumeSlider } from '../../molecules/VolumeSlider';
import { PlayerQueueDrawer } from './queue/PlayerQueueDrawer';

export const GlobalPlayer: React.FC = () => {
  const {
    currentTrack,
    queue,
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
      <div className="w-full h-22 bg-slate-900/95 border-t border-slate-800 backdrop-blur-xl px-6 flex items-center justify-between shadow-2xl">
        {/* Left: Now Playing Metadata */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[200px]">
          <TrackArtwork
            trackId={currentTrack.id}
            hasArtwork={currentTrack.hasArtwork}
            title={currentTrack.title}
            size="md"
          />
          <div className="min-w-0 pr-2">
            <p className="text-sm font-semibold text-slate-100 truncate">
              {currentTrack.title || currentTrack.fileName}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {currentTrack.artist || 'Unknown Artist'}
            </p>
          </div>
        </div>

        {/* Center: Controls & Seek bar */}
        <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
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

          <button
            type="button"
            title="Queue"
            onClick={() => {
              setIsQueueOpen((prev) => !prev);
            }}
            className={`p-2 rounded-lg transition-colors ${
              isQueueOpen
                ? 'text-indigo-400 bg-indigo-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ListMusic className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Queue Drawer */}
      <PlayerQueueDrawer
        isOpen={isQueueOpen}
        onClose={() => {
          setIsQueueOpen(false);
        }}
        queue={queue}
        currentTrackId={currentTrack.id}
        onPlayTrack={playTrack}
        onRemoveTrack={removeFromQueue}
        onClearQueue={clearQueue}
      />
    </>
  );
};
