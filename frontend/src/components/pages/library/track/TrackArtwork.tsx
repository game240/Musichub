import React, { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';
import { musicApi } from '../../../../api/musicApi';

export interface TrackArtworkProps {
  trackId: number;
  hasArtwork: boolean;
  title: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TrackArtwork: React.FC<TrackArtworkProps> = ({
  trackId,
  hasArtwork,
  title,
  className = '',
  size = 'md',
}) => {
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (hasArtwork) {
      musicApi
        .getArtworkUrl(trackId)
        .then((url) => {
          if (isMounted) {
            setArtworkUrl(url);
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsError(true);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [trackId, hasArtwork]);

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-md',
    md: 'w-11 h-11 rounded-lg',
    lg: 'w-14 h-14 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  if (!hasArtwork || isError || !artworkUrl) {
    return (
      <div
        className={`bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 border border-slate-700/60 shadow-inner ${sizeClasses[size]} ${className}`}
      >
        <Music2 className={iconSizes[size]} />
      </div>
    );
  }

  return (
    <img
      src={artworkUrl}
      alt={title || 'Track Artwork'}
      onError={() => {
        setIsError(true);
      }}
      className={`object-cover shrink-0 border border-slate-700/60 shadow-md ${sizeClasses[size]} ${className}`}
    />
  );
};
