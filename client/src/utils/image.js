/**
 * Image optimisation helpers.
 * Unsplash (and many image CDNs) resize/compress on the fly via URL params,
 * so we request only the pixels we need and let the browser pick via srcset.
 */
const WIDTHS = [400, 720, 1080, 1600];

function isUnsplash(url) {
  return /^https:\/\/images\.unsplash\.com\//.test(url);
}

export function optimizeImage(url, width = 720) {
  if (!url) return url;
  if (isUnsplash(url)) {
    const u = new URL(url);
    u.searchParams.set('auto', 'format'); // WebP/AVIF when supported
    u.searchParams.set('fit', 'crop');
    u.searchParams.set('w', String(width));
    u.searchParams.set('q', '70');
    return u.toString();
  }
  return url;
}

export function buildSrcSet(url) {
  if (!isUnsplash(url)) return undefined;
  return WIDTHS.map((w) => `${optimizeImage(url, w)} ${w}w`).join(', ');
}

export const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f1f1f1"/><path d="M200 105 150 148h14v47h28v-28h16v28h28v-47h14z" fill="#c4c4c4"/></svg>'
  );
