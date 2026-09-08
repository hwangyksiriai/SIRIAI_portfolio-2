// One-off migration: logs into the ORIGINAL siriai-portfolio deployment's
// admin API, pulls its live config (including anything uploaded later via
// the admin page, not just the git-seeded media/), downloads every clip,
// re-uploads each one to THIS project's own Blob store, and publishes the
// rewritten config as this project's config/site.json. After this runs,
// the new deployment no longer depends on the original site's Blob store
// at all.
//
// Must be run somewhere with real internet access (not this sandbox) —
// your machine, or `vercel dev` locally.
//
// Usage:
//   1. vercel link                        # link this folder to the NEW Vercel project
//   2. vercel env pull .env.local         # pulls the NEW project's BLOB_READ_WRITE_TOKEN
//   3. SOURCE_SITE_URL=https://siriai-portfolio.vercel.app \
//      SOURCE_ADMIN_PASSWORD=0907 \
//      npm run clone-remote

import { put } from '@vercel/blob';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SOURCE_SITE_URL = (process.env.SOURCE_SITE_URL || 'https://siriai-portfolio.vercel.app').replace(/\/$/, '');
const SOURCE_ADMIN_PASSWORD = process.env.SOURCE_ADMIN_PASSWORD;
const CONFIG_PATH = path.join(process.cwd(), 'lib', 'initialConfig.json');

function resolveUrl(clip) {
  return clip.startsWith('http://') || clip.startsWith('https://')
    ? clip
    : `${SOURCE_SITE_URL}${clip}`;
}

function blobPathnameFor(clip, index) {
  if (clip.startsWith('http://') || clip.startsWith('https://')) {
    const { pathname } = new URL(clip);
    return pathname.replace(/^\//, '');
  }
  return clip.replace(/^\//, '');
}

function contentTypeFor(pathname) {
  if (pathname.endsWith('.mp4')) return 'video/mp4';
  if (pathname.endsWith('.mov')) return 'video/quicktime';
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
  return undefined;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Missing BLOB_READ_WRITE_TOKEN — run `vercel link && vercel env pull .env.local` for the NEW project first.');
    process.exit(1);
  }
  if (!SOURCE_ADMIN_PASSWORD) {
    console.error('Missing SOURCE_ADMIN_PASSWORD (the admin password for the ORIGINAL site).');
    process.exit(1);
  }

  console.log(`Logging into ${SOURCE_SITE_URL} ...`);
  const loginRes = await fetch(`${SOURCE_SITE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: SOURCE_ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) throw new Error('Login succeeded but no session cookie was returned.');
  const cookie = setCookie.split(';')[0];

  console.log('Fetching live config...');
  const configRes = await fetch(`${SOURCE_SITE_URL}/api/admin/config`, {
    headers: { cookie },
  });
  if (!configRes.ok) {
    throw new Error(`Fetching config failed: ${configRes.status} ${await configRes.text()}`);
  }
  const config = await configRes.json();

  const clipRefs = [];
  for (const cat of config.categories) {
    if (Array.isArray(cat.clips)) {
      cat.clips.forEach((clip, i) => clipRefs.push({ set: (v) => (cat.clips[i] = v), clip }));
    }
    if (Array.isArray(cat.regions)) {
      for (const region of cat.regions) {
        region.clips.forEach((clip, i) => clipRefs.push({ set: (v) => (region.clips[i] = v), clip }));
      }
    }
  }
  console.log(`Found ${clipRefs.length} clips to clone.`);

  const urlMap = new Map();
  let done = 0;
  for (const ref of clipRefs) {
    done += 1;
    if (urlMap.has(ref.clip)) {
      ref.set(urlMap.get(ref.clip));
      continue;
    }
    const sourceUrl = resolveUrl(ref.clip);
    const pathname = blobPathnameFor(ref.clip, done);
    console.log(`[${done}/${clipRefs.length}] downloading ${sourceUrl}`);
    const fileRes = await fetch(sourceUrl);
    if (!fileRes.ok) {
      console.warn(`  ! failed to download (${fileRes.status}), leaving original reference`);
      continue;
    }
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const result = await put(pathname, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: contentTypeFor(pathname),
      allowOverwrite: true,
    });
    urlMap.set(ref.clip, result.url);
    ref.set(result.url);
    console.log(`  -> ${result.url}`);
  }

  console.log('Saving updated config locally and to this project\'s Blob store...');
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  await put('config/site.json', JSON.stringify(config, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
    allowOverwrite: true,
  });

  console.log(`Done. Cloned ${urlMap.size} unique clips independently into this project's Blob store.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
