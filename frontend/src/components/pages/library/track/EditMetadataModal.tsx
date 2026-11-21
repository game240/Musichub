import React, { useState } from 'react';
import { Modal } from '../../../organisms/Modal';
import { Button } from '../../../atoms/Button';
import { Input } from '../../../atoms/Input';
import { Spinner } from '../../../atoms/Spinner';
import { musicApi, type UpdateMusicMetadataDto } from '../../../../api/musicApi';
import { useTagSyncStore } from '../../../../stores/tagSyncStore';
import type { MusicFileDto } from '../../../../types/music';

export interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: MusicFileDto | null;
  onSuccess: (updatedTrack: MusicFileDto) => void;
}

interface EditMetadataFormProps {
  track: MusicFileDto;
  onClose: () => void;
  onSuccess: (updatedTrack: MusicFileDto) => void;
}

const EditMetadataForm: React.FC<EditMetadataFormProps> = ({ track, onClose, onSuccess }) => {
  const [title, setTitle] = useState(track.title || '');
  const [artist, setArtist] = useState(track.artist || '');
  const [album, setAlbum] = useState(track.album || '');
  const [year, setYear] = useState(track.year != null ? track.year.toString() : '');
  const [genre, setGenre] = useState(track.genre || '');
  const [trackNumber, setTrackNumber] = useState(
    track.trackNumber != null ? track.trackNumber.toString() : '',
  );
  const [lyrics, setLyrics] = useState(track.lyrics || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const parsedYear = year.trim() ? parseInt(year.trim(), 10) : null;
      const parsedTrackNumber = trackNumber.trim() ? parseInt(trackNumber.trim(), 10) : null;

      const payload: UpdateMusicMetadataDto = {
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim(),
        year: isNaN(parsedYear as number) ? null : parsedYear,
        genre: genre.trim(),
        trackNumber: isNaN(parsedTrackNumber as number) ? null : parsedTrackNumber,
        lyrics: lyrics.trim(),
      };

      const updated = await musicApi.updateMetadata(track.id, payload);
      // 우측 하단 백그라운드 R2 태그 동기화 위젯에 태스크 등록
      useTagSyncStore.getState().startSync(track.id, payload.title || track.fileName);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '메타데이터 수정에 실패했습니다.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {error}
        </div>
      ) : null}

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-neutral-300 mb-1.5">곡 제목</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          disabled={isSaving}
        />
      </div>

      {/* Artist & Album */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">아티스트</label>
          <Input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="아티스트"
            disabled={isSaving}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">앨범</label>
          <Input
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            placeholder="앨범명"
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Year, Genre, Track Number */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">발매년도</label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="예: 2024"
            min={1900}
            max={2100}
            disabled={isSaving}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">장르</label>
          <Input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="예: Pop, Rock"
            disabled={isSaving}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">트랙 번호</label>
          <Input
            type="number"
            value={trackNumber}
            onChange={(e) => setTrackNumber(e.target.value)}
            placeholder="트랙 #"
            min={1}
            max={999}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Lyrics */}
      <div>
        <label className="block text-xs font-medium text-neutral-300 mb-1.5">가사</label>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="가사를 입력하세요"
          rows={4}
          disabled={isSaving}
          className="w-full bg-[#0f1011] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all duration-150 resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
          취소
        </Button>
        <Button type="submit" variant="primary" disabled={isSaving}>
          {isSaving ? (
            <span className="flex items-center gap-1.5">
              <Spinner size="sm" /> 저장 중...
            </span>
          ) : (
            '저장'
          )}
        </Button>
      </div>
    </form>
  );
};

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen,
  onClose,
  track,
  onSuccess,
}) => {
  if (!track || !isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="곡 메타데이터 수정" maxWidth="lg">
      <EditMetadataForm key={track.id} track={track} onClose={onClose} onSuccess={onSuccess} />
    </Modal>
  );
};
