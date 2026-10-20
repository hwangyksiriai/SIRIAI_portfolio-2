// Local, opt-in processing. Never modifies originals or the live Blob config.
// FFMPEG=/path/to/ffmpeg node scripts/prepare-media.mjs [public/media/file.mp4 ...]
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const output = 'public/media-derived';
mkdirSync(output, { recursive: true });
const manifestPath = 'lib/media-manifest.json';
let manifest = {};
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch {}
function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : /\.(mp4|mov)$/i.test(file) ? [file] : [];
  });
}
const postersOnly = process.argv.includes('--posters-only');
const sourceUrl = process.argv.find(arg => arg.startsWith('--source-url='))?.slice(13);
if (sourceUrl) {
  const url = new URL(sourceUrl);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Expected a public HTTPS source URL');
}
const files = process.argv.slice(2).filter(arg => arg !== '--posters-only' && !arg.startsWith('--source-url='));
if (sourceUrl && files.length !== 1) throw new Error('--source-url requires exactly one downloaded source file');
for (const file of files.length ? files : walk('public/media')) {
  const src = sourceUrl || '/' + path.relative('public', file).split(path.sep).join('/');
  if (!sourceUrl && src.startsWith('/../')) throw new Error('Input must be inside public');
  const hash = createHash('sha256').update('preview-v1:').update(readFileSync(file)).digest('hex').slice(0, 16);
  function run(args) {
    const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, ...args], { encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
  }
  run(['-frames:v', '1', '-vf', 'thumbnail=60,scale=480:480:force_original_aspect_ratio=decrease', '-q:v', '3', `${output}/${hash}.jpg`]);
  if (!postersOnly) run(['-t', '6', '-an', '-vf', 'fps=15,scale=480:480:force_original_aspect_ratio=decrease:force_divisible_by=2', '-c:v', 'libx264', '-preset', 'medium', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${output}/${hash}.mp4`]);
  manifest[src] = { ...manifest[src], poster: `/media-derived/${hash}.jpg`, ...(!postersOnly ? { preview: `/media-derived/${hash}.mp4` } : {}) };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(src, postersOnly ? 'poster' : statSync(`${output}/${hash}.mp4`).size);
}
