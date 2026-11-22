import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '../../../organisms/Modal';
import { Button } from '../../../atoms/Button';
import { Input } from '../../../atoms/Input';
import { Checkbox } from '../../../atoms/Checkbox';
import { Spinner } from '../../../atoms/Spinner';
import { musicApi, type UpdateMusicMetadataDto } from '../../../../api/musicApi';
import { useTagSyncStore } from '../../../../stores/tagSyncStore';
import type { MusicFileDto } from '../../../../types/music';

export interface BatchEditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: MusicFileDto[];
  onSuccess: () => void;
}

export const BatchEditMetadataModal: React.FC<BatchEditMetadataModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onSuccess,
}) => {
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

  const hasAnyFieldSelected = applyArtist || applyAlbum || applyYear || applyGenre;

  const handleResetForm = () => {
    setApplyArtist(false);
    setArtist('');
    setApplyAlbum(false);
    setAlbum('');
    setApplyYear(false);
    setYear('');
    setApplyGenre(false);
    setGenre('');
    setError(null);
    setSaveProgress(null);
  };

  const handleClose = () => {
    if (!isSaving) {
      handleResetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyFieldSelected || tracks.length === 0 || isSaving) return;

    setError(null);
    setIsSaving(true);
    setSaveProgress(`1/${tracks.length}`);

    try {
      const parsedYear = year.trim() ? parseInt(year.trim(), 10) : null;
      const validYear = isNaN(parsedYear as number) ? null : parsedYear;

      let completedCount = 0;

      // Update tracks sequentially or with throttled promises to ensure DB stability
      for (const track of tracks) {
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
        setSaveProgress(`${completedCount}/${tracks.length}`);
      }

      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '메타데이터 일괄 수정에 실패했습니다.';
      setError(message);
    } finally {
      setIsSaving(false);
      setSaveProgress(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`선택한 ${tracks.length}개 음원 정보 일괄 수정`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Informational callout regarding preserved individual attributes */}
        <div className="flex items-start gap-2.5 p-3 bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 rounded-xl text-xs text-neutral-300">
          <Info className="w-4 h-4 text-[#8590ea] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            체크된 속성만 선택한 모든 곡에 덮어씌워지며, 체크하지 않은 속성 및 곡 제목, 트랙 번호,
            가사 등은 각 곡의 기존 값이 그대로 유지됩니다.
          </p>
        </div>

        {error ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        ) : null}

        {/* Artist Field */}
        <div className="space-y-1.5 p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.01]">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-300 cursor-pointer">
              <Checkbox
                checked={applyArtist}
                onChange={(checked) => setApplyArtist(checked)}
                disabled={isSaving}
              />
              <span>아티스트 일괄 지정</span>
            </label>
            <span className="text-[11px] text-neutral-500">
              {applyArtist ? '새 값으로 변경' : '기존 값 유지'}
            </span>
          </div>
          <Input
            value={artist}
            onChange={(e) => {
              setArtist(e.target.value);
              if (!applyArtist) setApplyArtist(true);
            }}
            placeholder="새 아티스트 이름"
            disabled={!applyArtist || isSaving}
            className={!applyArtist ? 'opacity-40' : ''}
          />
        </div>

        {/* Album Field */}
        <div className="space-y-1.5 p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.01]">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-300 cursor-pointer">
              <Checkbox
                checked={applyAlbum}
                onChange={(checked) => setApplyAlbum(checked)}
                disabled={isSaving}
              />
              <span>앨범명 일괄 지정</span>
            </label>
            <span className="text-[11px] text-neutral-500">
              {applyAlbum ? '새 값으로 변경' : '기존 값 유지'}
            </span>
          </div>
          <Input
            value={album}
            onChange={(e) => {
              setAlbum(e.target.value);
              if (!applyAlbum) setApplyAlbum(true);
            }}
            placeholder="새 앨범명"
            disabled={!applyAlbum || isSaving}
            className={!applyAlbum ? 'opacity-40' : ''}
          />
        </div>

        {/* Year and Genre (2 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Year Field */}
          <div className="space-y-1.5 p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-300 cursor-pointer">
                <Checkbox
                  checked={applyYear}
                  onChange={(checked) => setApplyYear(checked)}
                  disabled={isSaving}
                />
                <span>발매년도</span>
              </label>
              <span className="text-[11px] text-neutral-500">
                {applyYear ? '변경' : '유지'}
              </span>
            </div>
            <Input
              type="number"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                if (!applyYear) setApplyYear(true);
              }}
              placeholder="예: 2024"
              disabled={!applyYear || isSaving}
              className={!applyYear ? 'opacity-40' : ''}
            />
          </div>

          {/* Genre Field */}
          <div className="space-y-1.5 p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-300 cursor-pointer">
                <Checkbox
                  checked={applyGenre}
                  onChange={(checked) => setApplyGenre(checked)}
                  disabled={isSaving}
                />
                <span>장르</span>
              </label>
              <span className="text-[11px] text-neutral-500">
                {applyGenre ? '변경' : '유지'}
              </span>
            </div>
            <Input
              value={genre}
              onChange={(e) => {
                setGenre(e.target.value);
                if (!applyGenre) setApplyGenre(true);
              }}
              placeholder="예: K-Pop, Ballad"
              disabled={!applyGenre || isSaving}
              className={!applyGenre ? 'opacity-40' : ''}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!hasAnyFieldSelected || isSaving}
            className="min-w-[130px]"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>적용 중 ({saveProgress})...</span>
              </div>
            ) : (
              <span>{tracks.length}개 곡 일괄 적용</span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
