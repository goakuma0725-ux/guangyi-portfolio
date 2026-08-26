// Keeps the git repo lean: content authors (via the CMS or by hand) can upload
// full camera-resolution originals without thinking about file size. This
// caps the archived source at MAX_EDGE px — well above the 1920px the site
// ever actually outputs (see guangyi_portfolio_site_prompt_2.md §6), so
// there's no visible quality loss, only smaller files in git.
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..', 'src', 'content', 'works');
const MAX_EDGE = 2400;
const JPEG_QUALITY = 85;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let changed = 0;

for await (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (!['.jpg', '.jpeg'].includes(ext)) continue;

  // Read fully into memory first — sharp/libvips keeps the source file open
  // for the life of the pipeline, which makes overwriting it in place
  // unreliable (fails outright on Windows). A buffer has no such handle.
  const before = (await stat(file)).size;
  const original = await readFile(file);
  const meta = await sharp(original).metadata();
  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
  if (longEdge <= MAX_EDGE) continue;

  const resized = await sharp(original)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  await writeFile(file, resized);
  const after = resized.length;

  console.log(`[shrink-source-images] ${file}: ${longEdge}px → ${MAX_EDGE}px, ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(1)}MB`);
  changed++;
}

console.log(`[shrink-source-images] done, ${changed} file(s) resized.`);
