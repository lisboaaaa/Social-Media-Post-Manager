const POST_MEDIA_MARKER = "/post-media/";

// Public Storage URLs look like ".../object/public/post-media/<path>" —
// this is the inverse of getPublicUrl(), needed anywhere a file has to be
// removed given only the URL that was stored on a row.
export function storagePathFromPublicUrl(url: string): string | null {
  const index = url.indexOf(POST_MEDIA_MARKER);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + POST_MEDIA_MARKER.length));
}
