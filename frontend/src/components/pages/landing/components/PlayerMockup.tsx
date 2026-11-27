import React, { useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Music2, Disc3 } from 'lucide-react';

interface MockTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  badge?: string;
}

const MOCK_TRACKS: MockTrack[] = [
  {
    id: '1',
    title: 'Square (2017) [Live at Pop Music Festival]',
    artist: '백예린 (Yerin Baek)',
    album: 'Festival Bootleg Live 2017',
    duration: '04:18',
    badge: '라이브 음원',
  },
  {
    id: '2',
    title: 'Hype Boy (Acoustic Unplugged Session)',
    artist: 'NewJeans',
    album: 'Cover & Live Archive',
    duration: '03:12',
    badge: '미발매 커버',
  },
  {
    id: '3',
    title: '고양이 (Cat) [Studio Demo Ver.]',
    artist: '선우정아 (Sunwoojunga)',
    album: 'Secret Soundcloud Gems',
    duration: '03:45',
    badge: '사운드클라우드',
  },
  {
    id: '4',
    title: 'Space Oddity (2016 Remaster FLAC)',
    artist: 'David Bowie',
    album: 'Original CD Vinyl Rip',
    duration: '05:14',
    badge: 'CD 리핑 24bit',
  },
];

export const PlayerMockup: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);

  const currentTrack = MOCK_TRACKS[selectedTrackIndex];

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-white/[0.08] bg-[#0f1011]/90 backdrop-blur-xl shadow-2xl shadow-black/80 overflow-hidden text-neutral-200">
      {/* Mockup Header Bar */}
      <div className="h-10 px-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-700/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-700/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-700/80" />
          </div>
          <span className="ml-2 font-mono text-[11px] text-neutral-500">
            Music Hub • Direct Cloud Stream
          </span>
        </div>

        {/* Live Audio Equalizer Waveform indicator */}
        <div className="flex items-center gap-1.5 bg-white/[0.04] px-2 py-1 rounded-full border border-white/[0.06]">
          <div className="flex items-end gap-[3px] h-4">
            <span
              className={`w-[2.5px] rounded-full bg-[#5e6ad2] ${
                isPlaying ? 'animate-wave-1' : 'h-1.5'
              }`}
            />
            <span
              className={`w-[2.5px] rounded-full bg-[#5e6ad2] ${
                isPlaying ? 'animate-wave-2' : 'h-2'
              }`}
            />
            <span
              className={`w-[2.5px] rounded-full bg-[#5e6ad2] ${
                isPlaying ? 'animate-wave-3' : 'h-1'
              }`}
            />
            <span
              className={`w-[2.5px] rounded-full bg-[#5e6ad2] ${
                isPlaying ? 'animate-wave-4' : 'h-2.5'
              }`}
            />
          </div>
          <span className="text-[10px] font-mono text-neutral-400 font-medium">
            {isPlaying ? '스트리밍 중' : '일시정지'}
          </span>
        </div>
      </div>

      {/* Main Player Display */}
      <div className="p-5 md:p-6 flex flex-col md:flex-row items-center gap-5 border-b border-white/[0.06] bg-white/[0.02]">
        {/* Album Artwork */}
        <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-xl overflow-hidden bg-[#18191d] border border-white/10 flex-shrink-0 shadow-lg group">
          <div className="absolute inset-0 flex items-center justify-center">
            <Disc3
              className={`w-14 h-14 text-white/70 ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '8s' }}
            />
          </div>
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-mono text-white/90 border border-white/10">
            FLAC
          </div>
        </div>

        {/* Track Metadata & Controls */}
        <div className="flex-1 w-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#5e6ad2]/15 text-[#8590ed] border border-[#5e6ad2]/30">
                {currentTrack.badge}
              </span>
            </div>
            <h4 className="text-base md:text-lg font-semibold text-white tracking-tight line-clamp-1">
              {currentTrack.title}
            </h4>
            <p className="text-xs md:text-sm text-neutral-400 mt-0.5">
              {currentTrack.artist} <span className="text-neutral-600">•</span> {currentTrack.album}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden relative cursor-pointer group">
              <div
                className="bg-[#5e6ad2] h-full rounded-full transition-all duration-300"
                style={{ width: isPlaying ? '48%' : '48%' }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-mono text-neutral-400 mt-1.5">
              <span>01:54</span>
              <span>{currentTrack.duration}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedTrackIndex((prev) => (prev === 0 ? MOCK_TRACKS.length - 1 : prev - 1))
                }
                className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                title="이전 트랙"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors flex items-center justify-center shadow-md active:scale-95"
                title={isPlaying ? '일시정지' : '재생'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrackIndex((prev) => (prev + 1) % MOCK_TRACKS.length)}
                className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                title="다음 트랙"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-neutral-400 text-xs">
              <Volume2 className="w-4 h-4" />
              <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="w-3/4 h-full bg-neutral-300 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track List Preview */}
      <div className="divide-y divide-white/[0.04] bg-[#0c0d0e]">
        <div className="px-4 py-2 text-[11px] text-neutral-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
          <Music2 className="w-3.5 h-3.5 text-[#5e6ad2]" />
          <span>보관함 재생 대기열 ({MOCK_TRACKS.length}곡)</span>
        </div>
        {MOCK_TRACKS.map((track, idx) => {
          const isCurrent = idx === selectedTrackIndex;
          return (
            <div
              key={track.id}
              onClick={() => {
                setSelectedTrackIndex(idx);
                setIsPlaying(true);
              }}
              className={`px-4 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                isCurrent ? 'bg-[#5e6ad2]/10 text-white' : 'hover:bg-white/[0.03] text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-4 text-center font-mono text-[11px] text-neutral-500">
                  {isCurrent && isPlaying ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2] inline-block animate-pulse" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <div className="truncate">
                  <span className={`font-medium ${isCurrent ? 'text-white' : ''}`}>
                    {track.title}
                  </span>
                  <span className="text-neutral-500 ml-2 hidden sm:inline">{track.artist}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[10px] text-neutral-500 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] hidden md:inline">
                  {track.badge}
                </span>
                <span className="font-mono text-[11px] text-neutral-500">{track.duration}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
