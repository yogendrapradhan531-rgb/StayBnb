import { useState } from 'react';
import { buildSrcSet, FALLBACK_IMAGE, optimizeImage } from '../utils/image.js';

/**
 * <img> with responsive srcset, lazy loading, async decoding and a
 * graceful fallback if the URL is broken.
 */
export default function SmartImage({ src, alt, sizes = '(max-width: 768px) 100vw, 33vw', width = 720, eager = false, className }) {
  const [failed, setFailed] = useState(false);
  const finalSrc = failed || !src ? FALLBACK_IMAGE : optimizeImage(src, width);

  return (
    <img
      className={className}
      src={finalSrc}
      srcSet={failed ? undefined : buildSrcSet(src)}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
