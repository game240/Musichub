import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Music } from 'lucide-react';
import { Modal } from '../../../organisms/Modal';
import { Button } from '../../../atoms/Button';
import { Input } from '../../../atoms/Input';
import { Checkbox } from '../../../atoms/Checkbox';
import { Spinner } from '../../../atoms/Spinner';
import { TrackArtwork } from './TrackArtwork';
import { musicApi, type UpdateMusicMetadataDto } from '../../../../api/musicApi';
import { useTagSyncStore } from '../../../../stores/tagSyncStore';
import type { MusicFileDto } from '../../../../types/music';
import { cn } from '../../../../utils/cn';

export interface BatchEditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: MusicFileDto[];
  onSuccess: () => void;
}

interface BatchEditMetadataFormProps {
  tracks: MusicFileDto[];
  onClose: () => void;
  onSuccess: () => void;
}

const BatchEditMetadataForm: React.FC<BatchEditMetadataFormProps> = ({
  tracks,
  onClose,
  onSuccess,
}) => {
  // Local list of tracks to allow previewing and removing tracks inside the modal
  const [trackList, setTrackList] = useState<MusicFileDto[]>(tracks);
  const [isTrackListExpanded, setIsTrackListExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const artistInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);
  const genreInputRef = useRef<HTMLInputElement>(null);

  const [applyArtist, setApplyArtist] = useState(false);
  const [artist, setArtist] = useState('');

  const [applyAlbum, setApplyAlbum] = useState(false);
  const [album, setAlbum] = useState('');

  const [applyYear, setApplyYear] = useState(false);
  const [year, setYear] = useState('');

  const [applyGenre, setApplyGenre] = useState(false);
  const [genre, setGenre] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Close floating track list popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTrackListExpanded(false);
      }
    };

    if (isTrackListExpanded) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isTrackListExpanded]);

  const hasAnyFieldSelected = applyArtist || applyAlbum || applyYear || applyGenre;

  const handleRemoveTrack = (trackId: number) => {
    if (trackList.length <= 1) return; // Keep at least one track
    setTrackList((prev) => prev.filter((t) => t.id !== trackId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyFieldSelected || trackList.length === 0 || isSaving) return;

    setError(null);
    setIsSaving(true);
    setSaveProgress(`1/${trackList.length}`);

    try {
      const parsedYear = year.trim() ? parseInt(year.trim(), 10) : null;
      const validYear = isNaN(parsedYear as number) ? null : parsedYear;

      let completedCount = 0;

      // Update tracks sequentially to ensure backend DB and R2 dispatch stability
      for (const track of trackList) {
        const payload: UpdateMusicMetadataDto = {
          title: track.title || '',
          artist: applyArtist ? artist.trim() : (track.artist || ''),
          album: applyAlbum ? album.trim() : (track.album || ''),
          year: applyYear ? validYear : track.year,
          genre: applyGenre ? genre.trim() : (track.genre || ''),
          trackNumber: track.trackNumber,
          lyrics: track.lyrics || '',
        };

        try {
          await musicApi.updateMetadata(track.id, payload);
          // Register background R2 ID3 tag sync task
          useTagSyncStore.getState().startSync(track.id, payload.title || track.fileName);
        } catch (err) {
          console.error(`Failed to update metadata for track ${track.id}:`, err);
        }

        completedCount++;
        setSaveProgress(`${completedCount}/${trackList.length}`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '메타데이터 일괄 수정에 실패했습니다.';
      setError(message);
    } finally {
      setIsSaving(false);
      setSaveProgress(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selected Tracks Preview Header with Floating Popover (Doesn't affect modal height) */}
      <div className="relative" ref={dropdownRef}>
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsTrackListExpanded((prev) => !prev)}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-left transition-colors cursor-pointer select-none',
            isTrackListExpanded
              ? 'bg-white/[0.06] border-[#5e6ad2]/50 text-white shadow-sm'
              : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04] text-neutral-200',
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Music className="w-3.5 h-3.5 text-[#8590ea] shrink-0" />
            <span className="text-xs font-medium text-neutral-200 whitespace-nowrap">
              선택한 음원 ({trackList.length}곡)
            </span>
            <span className="text-[11px] text-neutral-400 truncate max-w-[180px] sm:max-w-xs">
              {trackList.map((t) => t.title || t.fileName).join(', ')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs shrink-0 pl-2">
            {isTrackListExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#8590ea]" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {/* Floating Scrollable Popover List (Overlays on top of the modal form with z-30) */}
        {isTrackListExpanded && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[#0f1011] border border-white/[0.15] rounded-xl shadow-2xl shadow-black/90 p-1.5 backdrop-blur-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/[0.06] mb-1">
              <span className="text-[11px] font-medium text-neutral-400">
                선택된 음원 목록 ({trackList.length}곡)
              </span>
              <button
                type="button"
                onClick={() => setIsTrackListExpanded(false)}
                className="text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-white/[0.04]">
              {trackList.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <TrackArtwork
                      trackId={t.id}
                      hasArtwork={t.hasArtwork}
                      artworkUrl={t.artworkUrl}
                      title={t.title}
                      size="sm"
                      className="w-7 h-7 rounded shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-neutral-200 truncate">
                        {t.title || t.fileName}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {t.artist || '알 수 없는 아티스트'} · {t.album || '앨범 없음'}
                      </p>
                    </div>
                  </div>

                  {/* Remove from batch selection button */}
                  {trackList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(t.id)}
                      disabled={isSaving}
                      aria-label="이 음원 수정 대상에서 제외"
                      className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-white/10 rounded transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {error}
        </div>
      ) : null}

      {/* Artist Field Card */}
      <div
        onClick={() => {
          if (!applyArtist && !isSaving) {
            setApplyArtist(true);
          }
        }}
        className={cn(
          'p-3 rounded-xl border transition-all duration-200',
          !applyArtist && 'cursor-pointer',
          applyArtist
            ? 'bg-[#5e6ad2]/[0.07] border-[#5e6ad2]/40 shadow-sm shadow-[#5e6ad2]/10'
            : 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.15]',
        )}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!isSaving) setApplyArtist((prev) => !prev);
          }}
          className="flex items-center gap-2 mb-2 cursor-pointer select-none group/header"
        >
          <Checkbox
            checked={applyArtist}
            onChange={(checked) => setApplyArtist(checked)}
            disabled={isSaving}
          />
          <span
            className={cn(
              'text-xs font-medium transition-colors',
              applyArtist
                ? 'text-white font-semibold'
                : 'text-neutral-400 group-hover/header:text-neutral-200',
            )}
          >
            아티스트
          </span>
        </div>
        <Input
          ref={artistInputRef}
          value={artist}
          onChange={(e) => {
            setArtist(e.target.value);
            if (!applyArtist) setApplyArtist(true);
          }}
          placeholder="일괄 적용할 아티스트 이름"
          disabled={isSaving}
          readOnly={!applyArtist}
          onClick={() => {
            if (!applyArtist && !isSaving) {
              setApplyArtist(true);
              setTimeout(() => artistInputRef.current?.focus(), 0);
            }
          }}
          className={cn(
            'transition-all',
            applyArtist
              ? 'cursor-text'
              : 'opacity-40 cursor-pointer hover:opacity-75 bg-transparent border-white/[0.06] hover:border-white/[0.2]',
          )}
        />
      </div>

      {/* Album Field Card */}
      <div
        onClick={() => {
          if (!applyAlbum && !isSaving) {
            setApplyAlbum(true);
          }
        }}
        className={cn(
          'p-3 rounded-xl border transition-all duration-200',
          !applyAlbum && 'cursor-pointer',
          applyAlbum
            ? 'bg-[#5e6ad2]/[0.07] border-[#5e6ad2]/40 shadow-sm shadow-[#5e6ad2]/10'
            : 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.15]',
        )}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!isSaving) setApplyAlbum((prev) => !prev);
          }}
          className="flex items-center gap-2 mb-2 cursor-pointer select-none group/header"
        >
          <Checkbox
            checked={applyAlbum}
            onChange={(checked) => setApplyAlbum(checked)}
            disabled={isSaving}
          />
          <span
            className={cn(
              'text-xs font-medium transition-colors',
              applyAlbum
                ? 'text-white font-semibold'
                : 'text-neutral-400 group-hover/header:text-neutral-200',
            )}
          >
            앨범명
          </span>
        </div>
        <Input
          ref={albumInputRef}
          value={album}
          onChange={(e) => {
            setAlbum(e.target.value);
            if (!applyAlbum) setApplyAlbum(true);
          }}
          placeholder="일괄 적용할 앨범명"
          disabled={isSaving}
          readOnly={!applyAlbum}
          onClick={() => {
            if (!applyAlbum && !isSaving) {
              setApplyAlbum(true);
              setTimeout(() => albumInputRef.current?.focus(), 0);
            }
          }}
          className={cn(
            'transition-all',
            applyAlbum
              ? 'cursor-text'
              : 'opacity-40 cursor-pointer hover:opacity-75 bg-transparent border-white/[0.06] hover:border-white/[0.2]',
          )}
        />
      </div>

      {/* Year and Genre (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Year Field Card */}
        <div
          onClick={() => {
            if (!applyYear && !isSaving) {
              setApplyYear(true);
            }
          }}
          className={cn(
            'p-3 rounded-xl border transition-all duration-200',
            !applyYear && 'cursor-pointer',
            applyYear
              ? 'bg-[#5e6ad2]/[0.07] border-[#5e6ad2]/40 shadow-sm shadow-[#5e6ad2]/10'
              : 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.15]',
          )}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!isSaving) setApplyYear((prev) => !prev);
            }}
            className="flex items-center gap-2 mb-2 cursor-pointer select-none group/header"
          >
            <Checkbox
              checked={applyYear}
              onChange={(checked) => setApplyYear(checked)}
              disabled={isSaving}
            />
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                applyYear
                  ? 'text-white font-semibold'
                  : 'text-neutral-400 group-hover/header:text-neutral-200',
              )}
            >
              발매년도
            </span>
          </div>
          <Input
            ref={yearInputRef}
            type="number"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              if (!applyYear) setApplyYear(true);
            }}
            placeholder="예: 2024"
            disabled={isSaving}
            readOnly={!applyYear}
            onClick={() => {
              if (!applyYear && !isSaving) {
                setApplyYear(true);
                setTimeout(() => yearInputRef.current?.focus(), 0);
              }
            }}
            className={cn(
              'transition-all',
              applyYear
                ? 'cursor-text'
                : 'opacity-40 cursor-pointer hover:opacity-75 bg-transparent border-white/[0.06] hover:border-white/[0.2]',
            )}
          />
        </div>

        {/* Genre Field Card */}
        <div
          onClick={() => {
            if (!applyGenre && !isSaving) {
              setApplyGenre(true);
            }
          }}
          className={cn(
            'p-3 rounded-xl border transition-all duration-200',
            !applyGenre && 'cursor-pointer',
            applyGenre
              ? 'bg-[#5e6ad2]/[0.07] border-[#5e6ad2]/40 shadow-sm shadow-[#5e6ad2]/10'
              : 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.15]',
          )}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!isSaving) setApplyGenre((prev) => !prev);
            }}
            className="flex items-center gap-2 mb-2 cursor-pointer select-none group/header"
          >
            <Checkbox
              checked={applyGenre}
              onChange={(checked) => setApplyGenre(checked)}
              disabled={isSaving}
            />
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                applyGenre
                  ? 'text-white font-semibold'
                  : 'text-neutral-400 group-hover/header:text-neutral-200',
              )}
            >
              장르
            </span>
          </div>
          <Input
            ref={genreInputRef}
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value);
              if (!applyGenre) setApplyGenre(true);
            }}
            placeholder="예: K-Pop, R&B"
            disabled={isSaving}
            readOnly={!applyGenre}
            onClick={() => {
              if (!applyGenre && !isSaving) {
                setApplyGenre(true);
                setTimeout(() => genreInputRef.current?.focus(), 0);
              }
            }}
            className={cn(
              'transition-all',
              applyGenre
                ? 'cursor-text'
                : 'opacity-40 cursor-pointer hover:opacity-75 bg-transparent border-white/[0.06] hover:border-white/[0.2]',
            )}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
          취소
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!hasAnyFieldSelected || isSaving || trackList.length === 0}
          className="min-w-[130px]"
        >
          {isSaving ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span>적용 중 ({saveProgress})...</span>
            </div>
          ) : (
            <span>{trackList.length}개 곡 일괄 적용</span>
          )}
        </Button>
      </div>
    </form>
  );
};

export const BatchEditMetadataModal: React.FC<BatchEditMetadataModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onSuccess,
}) => {
  if (!isOpen || tracks.length === 0) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`음원 정보 일괄 수정 (${tracks.length}곡)`}
      maxWidth="lg"
    >
      <BatchEditMetadataForm tracks={tracks} onClose={onClose} onSuccess={onSuccess} />
    </Modal>
  );
};
