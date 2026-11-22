import React, { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';
import { musicApi } from '../../../../api/musicApi';

export interface TrackArtworkProps {
  trackId: number;
  hasArtwork: boolean;
  artworkUrl?: string | null;
  title: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TrackArtwork: React.FC<TrackArtworkProps> = ({
  trackId,
  hasArtwork,
  artworkUrl: propArtworkUrl,
  title,
  className = '',
  size = 'md',
}) => {
  const [fetchedArtworkUrl, setFetchedArtworkUrl] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const finalArtworkUrl = propArtworkUrl ?? fetchedArtworkUrl;

  useEffect(() => {
    // If artworkUrl is already provided via props, avoid redundant N+1 API calls
    if (propArtworkUrl !== undefined) {
      return;
    }

    let isMounted = true;
    if (hasArtwork) {
      musicApi
        .getArtworkUrl(trackId)
        .then((url) => {
          if (isMounted) {
            setFetchedArtworkUrl(url);
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
  }, [trackId, hasArtwork, propArtworkUrl]);

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-md',
    md: 'w-10 h-10 rounded-lg',
    lg: 'w-14 h-14 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  if (!hasArtwork || isError || !finalArtworkUrl) {
    return (
      <div
        className={`bg-white/[0.04] flex items-center justify-center text-neutral-500 shrink-0 border border-white/[0.08] ${sizeClasses[size]} ${className}`}
      >
        <Music2 className={iconSizes[size]} />
      </div>
    );
  }

  return (
    <img
      src={finalArtworkUrl}
      alt={title || '앨범 커버'}
      loading="lazy"
      onError={() => {
        setIsError(true);
      }}
      className={`object-cover shrink-0 border border-white/[0.08] shadow-md ${sizeClasses[size]} ${className}`}
    />
  );
};
