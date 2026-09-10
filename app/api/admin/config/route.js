import { NextResponse } from 'next/server';
import { loadConfig, saveConfig } from '@/lib/blobConfig';
import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

async function requireAuth(request) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  return isValidSession(cookie);
}

export async function GET(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { config } = await loadConfig();
    return NextResponse.json(config);
  } catch (err) {
    // Deliberately not falling back to the bundled sample config: the admin
    // saves whatever it loaded, so serving sample data here would let a
    // failed read overwrite the real one.
    console.error('admin loadConfig failed', err);
    return NextResponse.json(
      { error: `저장된 설정을 불러오지 못했습니다: ${err.message}` },
      { status: 503 }
    );
  }
}

export async function PUT(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const config = await request.json();
  if (!config || !Array.isArray(config.categories)) {
    return NextResponse.json({ error: 'invalid config shape' }, { status: 400 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN이 없습니다. Vercel 프로젝트에 Blob 스토어를 연결해주세요.' },
      { status: 500 }
    );
  }
  try {
    await saveConfig(config);
  } catch (err) {
    // Without this the thrown error becomes an HTML 500 page and the admin
    // can only report a generic failure.
    console.error('saveConfig failed', err);
    return NextResponse.json({ error: err.message || 'blob write failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
