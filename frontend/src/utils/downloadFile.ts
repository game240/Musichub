/**
 * Triggers a browser download using a temporary hidden anchor tag.
 */
export function triggerBrowserDownload(url: string, fileName?: string): void {
  const link = document.createElement('a');
  link.href = url;
  if (fileName) {
    link.download = fileName;
  }
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
