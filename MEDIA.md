# Portfolio media

Cards use content-hashed JPEG posters and six-second H.264 previews (15 fps,
480px longest side, CRF 28, no audio, faststart). The original URL is preserved
for the controlled expanded player. Only intersecting cards on a visible page
play; leaving the viewport pauses the existing element without clearing its URL.
New/unknown URLs retain original playback with a branded fallback until processed.

Run locally with FFmpeg on PATH, or set `FFMPEG` to an existing binary:

```
node scripts/prepare-media.mjs public/media/beauty/lee-jerin.mp4
node scripts/prepare-media.mjs --source-url=https://PUBLIC-VIDEO-URL /path/to/downloaded-original.mp4
node scripts/check-media.mjs
```

No arguments processes bundled originals. `--posters-only` refreshes posters.
The script writes only `public/media-derived` and `lib/media-manifest.json`.
Regenerate and visually check each new batch before committing. Exact live Blob
aliases were connected only after comparing downloaded originals by SHA-256.
The source hash includes `preview-v1`; change the version when encoding settings
change. Keep original files and upload authentication/config storage unchanged.
Custom clip objects can supply `{ src, poster, preview, badge }` as well.

The upload endpoint remains unchanged: generating derivatives after upload still
requires a local operator/job. No transcoding subscription, new credential, or
Blob config write is introduced. Local sample checks do not certify every frame
or a physical Galaxy Tab.

## Next stage: offline sales set

Not implemented in this PR. A separate explicit “prepare 10–20 works” flow must
cache the shell, posters, previews, and chosen originals using versioned manifests.
Use Workbox RangeRequests only on successfully fetched complete status-200 files;
reject partial 206 and opaque responses, verify CORS, size and manifest version,
check `navigator.storage.estimate()`/persistence and handle quota/eviction.
Show ready only after every file verifies, and re-check readiness on launch.
Test Range seeking, airplane-mode cold relaunch and version upgrades on the actual
tablet. Opening a page once does not guarantee offline use.
