const POST_MEDIA_MARKER = "/post-media/";

// Storage keys reject spaces and non-ASCII characters (e.g. accented
// letters), so a filename fresh off someone's computer — "Captura de ecrã
// 2025.png" — fails outright. Collapse anything outside [A-Za-z0-9._-] into
// a single hyphen before it's ever used as (part of) a storage path.
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^A-Za-z0-9._-]+/g, "-");
}

// Public Storage URLs look like ".../object/public/post-media/<path>" —
// this is the inverse of getPublicUrl(), needed anywhere a file has to be
// removed given only the URL that was stored on a row.
export function storagePathFromPublicUrl(url: string): string | null {
  const index = url.indexOf(POST_MEDIA_MARKER);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + POST_MEDIA_MARKER.length));
}
