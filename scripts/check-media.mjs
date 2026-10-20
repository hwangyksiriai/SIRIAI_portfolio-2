import { readFileSync, existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const manifest = JSON.parse(readFileSync('lib/media-manifest.json', 'utf8'));
const previews = new Set();
for (const [src, media] of Object.entries(manifest)) {
  if (src.startsWith('/') && !existsSync(`public${src}`)) throw new Error(`Missing original: ${src}`);
  for (const file of [media.poster, media.preview]) {
    if (!file.startsWith('/media-derived/') || !existsSync(`public${file}`)) throw new Error(`Missing derivative: ${file}`);
  }
  previews.add(media.preview);
}
for (const preview of previews) {
  const result = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-hide_banner', '-i', `public${preview}`, '-f', 'null', '-'], { encoding: 'utf8' });
  if (result.error || result.status || /Audio:/.test(result.stderr) || !/Video: h264/.test(result.stderr)) throw new Error(`Invalid or audible preview: ${preview}\n${result.error || result.stderr}`);
  const dimensions = result.stderr.match(/Video: h264[^\n]*? (\d{2,5})x(\d{2,5})(?:,| )/);
  if (!dimensions || Math.max(+dimensions[1], +dimensions[2]) > 480) throw new Error(`Oversized preview: ${preview}`);
  if (statSync(`public${preview}`).size > 1000000) throw new Error(`Preview exceeds 1 MB: ${preview}`);
}
console.log(`PASS: ${Object.keys(manifest).length} mappings; ${previews.size} unique previews decode, H.264, silent, <=480px, <1MB`);
