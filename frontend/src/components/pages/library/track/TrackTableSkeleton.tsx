import React from 'react';
import { Skeleton } from '../../../atoms/Skeleton';
import { cn } from '../../../../utils/cn';

export interface TrackTableSkeletonProps {
  rowCount?: number;
}

const TITLE_WIDTHS = [
  'w-40 sm:w-52',
  'w-48 sm:w-64',
  'w-32 sm:w-44',
  'w-44 sm:w-56',
  'w-36 sm:w-48',
  'w-52 sm:w-60',
  'w-40 sm:w-50',
  'w-32 sm:w-40',
];

const ARTIST_WIDTHS = [
  'w-24 sm:w-32',
  'w-28 sm:w-36',
  'w-20 sm:w-24',
  'w-32 sm:w-40',
  'w-24 sm:w-28',
  'w-36 sm:w-44',
  'w-20 sm:w-30',
  'w-28 sm:w-34',
];

const ALBUM_WIDTHS = [
  'w-28 sm:w-40',
  'w-36 sm:w-48',
  'w-24 sm:w-32',
  'w-32 sm:w-44',
  'w-40 sm:w-52',
  'w-20 sm:w-28',
  'w-32 sm:w-40',
  'w-28 sm:w-36',
];

export const TrackRowSkeleton: React.FC<{ index: number }> = ({ index }) => {
  const titleWidth = TITLE_WIDTHS[index % TITLE_WIDTHS.length];
  const artistWidth = ARTIST_WIDTHS[index % ARTIST_WIDTHS.length];
  const albumWidth = ALBUM_WIDTHS[index % ALBUM_WIDTHS.length];

  return (
    <tr className="border-b border-white/[0.04] select-none">
      {/* Index Placeholder */}
      <td className="w-10 sm:w-14 py-2.5 px-1 sm:px-3 text-center bg-[#0f1011]">
        <div className="w-7 h-7 mx-auto flex items-center justify-center">
          <Skeleton className="w-4 h-3.5 rounded bg-white/[0.04]" />
        </div>
      </td>

      {/* Artwork + Title & Artist */}
      <td className="py-2.5 px-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-md shrink-0 bg-white/[0.07]" />
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <Skeleton className={cn('h-4 rounded bg-white/[0.08]', titleWidth)} />
            <Skeleton className={cn('h-3 rounded bg-white/[0.04]', artistWidth)} />
          </div>
        </div>
      </td>

      {/* Album (hidden on mobile) */}
      <td className="py-2.5 px-4 hidden md:table-cell">
        <Skeleton className={cn('h-3.5 rounded bg-white/[0.05]', albumWidth)} />
      </td>

      {/* Duration (hidden on small screens) */}
      <td className="py-2.5 px-4 hidden sm:table-cell">
        <Skeleton className="h-3.5 w-10 rounded bg-white/[0.05]" />
      </td>

      {/* File Size (hidden on tablet and below) */}
      <td className="py-2.5 px-4 hidden lg:table-cell">
        <Skeleton className="h-3.5 w-14 rounded bg-white/[0.05]" />
      </td>

      {/* Actions */}
      <td className="py-2.5 px-3 sm:px-4 text-center sm:text-right w-14 sm:w-36">
        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center justify-end gap-1.5">
          <Skeleton className="w-7 h-7 rounded-lg bg-white/[0.04]" />
          <Skeleton className="w-7 h-7 rounded-lg bg-white/[0.04]" />
          <Skeleton className="w-7 h-7 rounded-lg bg-white/[0.04]" />
          <Skeleton className="w-7 h-7 rounded-lg bg-white/[0.04]" />
        </div>

        {/* Mobile Action Kebab */}
        <div className="sm:hidden flex items-center justify-center">
          <Skeleton className="w-7 h-7 rounded-full bg-white/[0.04]" />
        </div>
      </td>
    </tr>
  );
};

export const TrackTableSkeleton: React.FC<TrackTableSkeletonProps> = ({ rowCount = 8 }) => {
  return (
    <div
      className="w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0f1011] shadow-2xl"
      aria-busy="true"
      aria-label="음원 목록을 불러오는 중입니다"
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.08] text-[11px] font-medium text-neutral-400 bg-white/[0.02]">
            <th className="py-2.5 px-1 sm:px-3 w-10 sm:w-14 text-center select-none">
              <div className="w-7 h-7 mx-auto flex items-center justify-center">
                <span>#</span>
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
          {Array.from({ length: rowCount }).map((_, idx) => (
            <TrackRowSkeleton key={idx} index={idx} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
