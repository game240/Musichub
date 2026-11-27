import { musicApi } from '../api/musicApi';
import type { MusicFileDto } from '../types/music';
import { triggerBrowserDownload } from './downloadFile';

export interface BatchDownloadResult {
  total: number;
  successful: number;
  failed: number;
  isZip?: boolean;
}

/**
 * Downloads audio files efficiently:
 * - Single track: directly downloads via presigned R2 GET URL (zero server egress, instant).
 * - Multiple tracks: bundles into a single streaming ZIP download via temporary ticket
 *   to completely avoid browser multi-file download popup/block suppression.
 */
export async function downloadTracksBatch(
  tracks: MusicFileDto[],
  onProgress?: (done: number, total: number) => void,
): Promise<BatchDownloadResult> {
  const total = tracks.length;
  if (total === 0) {
    return { total: 0, successful: 0, failed: 0 };
  }

  // Case 1: Single track selection -> direct presigned download
  if (total === 1) {
    const track = tracks[0];
    try {
      const { downloadUrl, fileName } = await musicApi.getDownloadUrl(track.id);
      triggerBrowserDownload(downloadUrl, fileName);
      onProgress?.(1, 1);
      return { total: 1, successful: 1, failed: 0, isZip: false };
    } catch (err) {
      console.error(
        `Failed to download track id ${track.id} (${track.title || track.fileName}):`,
        err,
      );
      return { total: 1, successful: 0, failed: 1, isZip: false };
    }
  }

  // Case 2: Multiple tracks -> Single streaming ZIP archive download via ticket
  try {
    onProgress?.(0, total);
    const musicFileIds = tracks.map((t) => t.id);
    const { downloadUrl } = await musicApi.createBatchDownloadTicket(musicFileIds);

    // Native single-file attachment download (bypasses browser multi-download blockers)
    triggerBrowserDownload(downloadUrl);
    onProgress?.(total, total);

    return { total, successful: total, failed: 0, isZip: true };
  } catch (err) {
    console.error('Failed to create batch download ticket:', err);
    throw err;
  }
}
