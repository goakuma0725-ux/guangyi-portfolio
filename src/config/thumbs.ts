import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';

const UPLOADS_PREFIX = '/images/uploads/';

// Card-sized WebP made from an uploaded original by scripts/make-thumbnails.mjs.
// Falls back to the original path when there's no thumbnail (external URLs, or
// the script hasn't run), so a missing thumbnail never means a broken image.
export function cardThumb(src: string): string {
  if (!src.startsWith(UPLOADS_PREFIX)) return src;

  let file = basename(src);
  try {
    file = decodeURIComponent(file);
  } catch {
    // filename contains a literal "%" — use it as-is
  }

  const onDisk = join(process.cwd(), 'public', 'images', 'thumbs', `${file}.webp`);
  if (!existsSync(onDisk)) return src;

  // encodeURI, not encodeURIComponent: filenames like "PAGE001 (0;00;15;00).jpg"
  // must keep their ";" literal — the dev server 404s on the %3B form.
  const encoded = encodeURI(file).replace(/[?#]/g, (c) => encodeURIComponent(c));
  return `/images/thumbs/${encoded}.webp`;
}
