import React from 'react';
import type { MusicFileDto } from '../../../../types/music';
import { TrackRow } from './TrackRow';
import { EmptyState } from '../../../molecules/EmptyState';
import { Checkbox } from '../../../atoms/Checkbox';

export interface TrackTableProps {
  tracks: MusicFileDto[];
  currentTrackId?: number;
  isPlaying: boolean;
  downloadingTrackId?: number | null;
  selectedTrackIds?: Set<number>;
  isSelectionMode?: boolean;
  onPlay: (track: MusicFileDto) => void;
  onAddToQueue: (track: MusicFileDto) => void;
  onEdit: (track: MusicFileDto) => void;
  onDelete: (track: MusicFileDto) => void;
  onDownload: (track: MusicFileDto) => void;
  onUploadClick: () => void;
  onToggleSelect?: (track: MusicFileDto, event: React.MouseEvent) => void;
  onToggleSelectAll?: () => void;
  isFiltered?: boolean;
}

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  downloadingTrackId,
  selectedTrackIds = new Set(),
  isSelectionMode = false,
  onPlay,
  onAddToQueue,
  onEdit,
  onDelete,
  onDownload,
  onUploadClick,
  onToggleSelect,
  onToggleSelectAll,
  isFiltered = false,
}) => {
  if (tracks.length === 0) {
    if (isFiltered) {
      return (
        <EmptyState title="검색 결과가 없습니다" description="검색어를 변경하여 다시 찾아보세요." />
      );
    }
    return (
      <EmptyState
        title="보관함에 등록된 음원이 없습니다"
        description="소장하고 계신 MP3, FLAC, M4A 오디오 파일을 업로드하여 스트리밍을 시작해보세요."
        actionLabel="첫 음원 업로드하기"
        onAction={onUploadClick}
      />
    );
  }

  const isAllSelected = tracks.length > 0 && tracks.every((t) => selectedTrackIds.has(t.id));
  const isIndeterminate = !isAllSelected && tracks.some((t) => selectedTrackIds.has(t.id));
  const showMasterCheckbox = isSelectionMode || isAllSelected || isIndeterminate;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0f1011] shadow-2xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="group/head border-b border-white/[0.08] text-[11px] font-medium text-neutral-400 bg-white/[0.02]">
            <th className="py-2.5 px-1 sm:px-3 w-10 sm:w-14 text-center">
              <div className="w-7 h-7 mx-auto flex items-center justify-center">
                {showMasterCheckbox ? (
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={() => {
                      if (onToggleSelectAll) {
                        onToggleSelectAll();
                      }
                    }}
                    aria-label="전체 트랙 선택"
                  />
                ) : (
                  <>
                    <span className="group-hover/head:hidden">#</span>
                    <div className="hidden group-hover/head:flex items-center justify-center">
                      <Checkbox
                        checked={false}
                        onChange={() => {
                          if (onToggleSelectAll) {
                            onToggleSelectAll();
                          }
                        }}
                        aria-label="전체 트랙 선택"
                      />
                    </div>
                  </>
                )}
              </div>
            </th>
            <th className="py-2.5 px-2 sm:px-4">곡 제목 / 아티스트</th>
            <th className="py-2.5 px-4 hidden md:table-cell">앨범</th>
            <th className="py-2.5 px-4 hidden sm:table-cell">재생 시간</th>
            <th className="py-2.5 px-4 hidden lg:table-cell">파일 크기</th>
            <th className="py-2.5 px-3 sm:px-4 text-center sm:text-right w-14 sm:w-36">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              isCurrent={track.id === currentTrackId}
              isPlaying={isPlaying}
              isDownloading={track.id === downloadingTrackId}
              isSelected={selectedTrackIds.has(track.id)}
              isSelectionMode={isSelectionMode}
              onPlay={onPlay}
              onAddToQueue={onAddToQueue}
              onEdit={onEdit}
              onDelete={onDelete}
              onDownload={onDownload}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
