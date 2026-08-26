// Runs on postinstall/prebuild — generates static assets that must not be
// computed in the browser (spec §8: LINE QR "建置時產生靜態 PNG,不要在前端跑 QR 函式庫").
import QRCode from 'qrcode';
import { mkdir } from 'node:fs/promises';
import site from '../src/data/site.json' with { type: 'json' };

await mkdir(new URL('../public/', import.meta.url), { recursive: true });

if (site.lineUrl) {
  const out = new URL('../public/line-qr.png', import.meta.url);
  await QRCode.toFile(out.pathname.replace(/^\/([A-Za-z]:)/, '$1'), site.lineUrl, {
    width: 480,
    margin: 1,
    color: { dark: '#111111', light: '#FAFAF9' },
  });
  console.log('[generate-static-assets] wrote public/line-qr.png for', site.lineUrl);
} else {
  console.log('[generate-static-assets] site.lineUrl is empty, skipping QR generation');
}
