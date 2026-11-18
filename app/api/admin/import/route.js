import { NextResponse } from 'next/server';
import { head, put } from '@vercel/blob';
import { loadConfig, saveConfig } from '@/lib/blobConfig';
import { collectBlobUrls, isBlobUrl, replaceUrls } from '@/lib/blobUrls';
import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

/* One-time move from the Blob store of the project this site used to live
   in. That store's read-write token is set as OLD_BLOB_READ_WRITE_TOKEN; the
   admin then walks three steps: GET lists the files the old config uses,
   POST {action:'copy'} copies one file per call (so no single request has
   to outlast a long video), POST {action:'finish'} saves the old config
   here with every copied URL swapped for its new one. Without the variable
   the feature is hidden and every call is refused. */

// Long videos are copied store-to-store in one call. 60s is allowed on
// every plan; a larger value would fail the deploy on some.
export const maxDuration = 60;

const oldToken = () => process.env.OLD_BLOB_READ_WRITE_TOKEN;

async function guard(request) {
  if (!(await isValidSession(request.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!oldToken()) {
    return NextResponse.json({ error: 'OLD_BLOB_READ_WRITE_TOKEN이 설정되어 있지 않습니다.' }, { status: 404 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN이 없습니다. 이 프로젝트에 Blob 스토어를 연결해주세요.' }, { status: 500 });
  }
  if (oldToken() === process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: '기존 저장소와 지금 저장소가 같습니다. OLD_BLOB_READ_WRITE_TOKEN에는 예전 프로젝트의 토큰을 넣어주세요.' }, { status: 400 });
  }
  return null;
}

async function loadOldConfig() {
  const { config, source } = await loadConfig({ token: oldToken() });
  if (source !== 'blob') throw new Error('기존 저장소에서 설정 파일(config/site.json)을 찾지 못했습니다.');
  return config;
}

export async function GET(request) {
  const denied = await guard(request);
  if (denied) return denied;
  try {
    return NextResponse.json({ files: collectBlobUrls(await loadOldConfig()) });
  } catch (err) {
    console.error('import plan failed', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(request) {
  const denied = await guard(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));

  try {
    if (body.action === 'copy') {
      // head() with the old token only succeeds for files in the old store,
      // so this can't be pointed at anything else.
      if (!isBlobUrl(body.url)) throw new Error('invalid url');
      const meta = await head(body.url, { token: oldToken() });
      const res = await fetch(meta.url, { cache: 'no-store' });
      if (!res.ok || !res.body) throw new Error(`download failed: ${res.status}`);
      const copied = await put(meta.pathname, res.body, {
        access: 'public',
        addRandomSuffix: false,
        contentType: meta.contentType,
        multipart: true,
      });
      return NextResponse.json({ url: copied.url });
    }

    if (body.action === 'finish') {
      const map = Object.fromEntries(
        Object.entries(body.map || {}).filter(([from, to]) => isBlobUrl(from) && isBlobUrl(to))
      );
      const config = replaceUrls(await loadOldConfig(), map);
      await saveConfig(config);
      return NextResponse.json({ ok: true, remaining: collectBlobUrls(config).filter((u) => !Object.values(map).includes(u)).length });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    console.error('import step failed', body.action, err);
    return NextResponse.json({ error: err.message || 'import failed' }, { status: 502 });
  }
}
