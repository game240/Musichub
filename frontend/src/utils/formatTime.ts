export function formatSeconds(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }

  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;

  const paddedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;
  return `${minutes}:${paddedSeconds}`;
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (!ms || isNaN(ms) || ms <= 0) {
    return '--:--';
  }
  return formatSeconds(ms / 1000);
}
