// Runs on prebuild/predev — makes card-sized WebP thumbnails of every uploaded
// image so the works grid doesn't download full-resolution originals for cards
// that are only ~330px wide. Output goes to public/images/thumbs/ (git-ignored,
// rebuilt on every deploy), so new uploads are picked up automatically.
//
// Kept out of public/images/uploads/ on purpose: Sveltia's media picker lists
// that folder, and the thumbnails would show up there as duplicates.
import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const SRC_DIR = join(ROOT, 'public', 'images', 'uploads');
const OUT_DIR = join(ROOT, 'public', 'images', 'thumbs');

// 4:3 to match the card's aspect box; 800px wide stays crisp on 2x screens
// (cards render ~230-330px wide) including the hover zoom.
const WIDTH = 800;
const HEIGHT = 600;
const QUALITY = 78;
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

await mkdir(OUT_DIR, { recursive: true });

let made = 0;
let skipped = 0;
let failed = 0;
const started = Date.now();

for (const name of await readdir(SRC_DIR)) {
  if (!EXTS.has(extname(name).toLowerCase())) continue;

  const src = join(SRC_DIR, name);
  const out = join(OUT_DIR, `${name}.webp`);

  try {
    const [srcStat, outStat] = await Promise.all([stat(src), stat(out).catch(() => null)]);
    if (outStat && outStat.mtimeMs >= srcStat.mtimeMs) {
      skipped++;
      continue;
    }

    await sharp(src, { failOn: 'none' })
      .rotate() // honor EXIF orientation
      .resize({ width: WIDTH, height: HEIGHT, fit: 'cover', position: 'centre', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(out);
    made++;
  } catch (err) {
    // A missing thumbnail is harmless: src/config/thumbs.ts falls back to the original.
    failed++;
    console.warn(`[make-thumbnails] skipped ${name}: ${err.message}`);
  }
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(`[make-thumbnails] ${made} made, ${skipped} up to date, ${failed} failed (${seconds}s)`);
