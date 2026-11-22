import { musicApi } from '../api/musicApi';
import type { MusicFileDto } from '../types/music';
import { triggerBrowserDownload } from './downloadFile';

export interface BatchDownloadResult {
  total: number;
  successful: number;
  failed: number;
}

/**
 * Downloads multiple audio files sequentially with a gentle delay between triggers.
 * Staggering (400ms) is essential to prevent browser multi-file download blocks and popup suppression.
 */
export async function downloadTracksBatch(
  tracks: MusicFileDto[],
  onProgress?: (done: number, total: number) => void,
): Promise<BatchDownloadResult> {
  const total = tracks.length;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const track = tracks[i];
    try {
      const { downloadUrl, fileName } = await musicApi.getDownloadUrl(track.id);
      triggerBrowserDownload(downloadUrl, fileName);
      successful++;
    } catch (err) {
      console.error(`Failed to download track id ${track.id} (${track.title || track.fileName}):`, err);
      failed++;
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }

    // Insert stagger delay between downloads if not the last item
    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  return { total, successful, failed };
}
