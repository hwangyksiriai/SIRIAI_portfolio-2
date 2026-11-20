# Task: re-encode the live clips' posters + previews at higher quality (v2)

Repo: hwangyksiriai/SIRIAI_portfolio-2. Work on `master` (`git checkout master && git pull origin master`); it must already contain commit `2ef7b58` ("Add posters and autoplay previews for all 356 live clips").

## Why
The site autoplays a 6-second preview per card from `public/media-derived/`, looked up in `lib/media-derived.json` by the clip URL's decoded pathname. The current previews are 270x480 @15fps, which looks soft and choppy on phones (a card is ~170 CSS px wide on 3x screens) and on retina desktops. The owner chose: **6-second previews, short side 540px, 30fps**. Posters get the same resolution so the loading frame is sharp too.

## Do
For every live clip, i.e. every key in `lib/media-derived.json` that starts with `/` and does NOT start with `/media/` (the 356 content-hash names like `/999ec6...d6a.mp4`), plus any key starting with `/media/cat-` (live uploads), download `https://nszercb65dwwbzyo.public.blob.vercel-storage.com<key>` (URL-encode the path when needed) to a temp dir outside the repo, then:
- id = first 16 hex of sha256(`"preview-v2:"` + file bytes)
- poster: `ffmpeg -i in -frames:v 1 -vf "thumbnail=60,scale='if(gt(iw,ih),-2,min(540,iw))':'if(gt(iw,ih),min(540,ih),-2)'" -q:v 3 public/media-derived/<id>.jpg`
- preview: `ffmpeg -i in -t 6 -an -vf "fps=30,scale='if(gt(iw,ih),-2,min(540,iw))':'if(gt(iw,ih),min(540,ih),-2)'" -c:v libx264 -preset medium -crf 24 -pix_fmt yuv420p -movflags +faststart public/media-derived/<id>.mp4`
  (portrait -> 540 wide, landscape -> 540 tall, never upscaled; if the source fps is under 30 keep the source fps instead of fps=30)
- set that key's entry to the new `{ "poster": "/media-derived/<id>.jpg", "preview": "/media-derived/<id>.mp4" }`
- `git rm` the old v1 jpg/mp4 for that key if no other key in the json still references it
- delete the downloaded original immediately; never commit originals; process sequentially; retry a failed download once; collect failures and continue (a failed clip keeps its v1 entry).
Keep all other keys untouched. Keep the json sorted, 2-space indented, trailing newline.

Do not change `app/`, the Blob store, the site config, or the admin.

## Verify
- every live key's poster and preview files exist; spot-check a few with ffprobe (portrait 540x960 / landscape 960x540 or smaller sources unscaled, 30fps or source fps, 6s) and by viewing 3-4 posters.
- `npm ci` if needed, `npm run build` passes.
- report total size of `public/media-derived` before/after.

## Ship
Commit on `master`, then `git pull --rebase origin master` and `git push -u origin master`. Commit message explains the above and ends with:
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XwFbcoeF6d1cifAsaxqS5C
```
Reply in Korean: processed count, failures (key + reason), sizes before/after, average preview size, commit hash.
