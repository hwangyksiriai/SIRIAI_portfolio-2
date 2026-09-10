import { NextResponse } from 'next/server';
import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

/* Reports whether the running deployment can see the config it needs, and
   which build is actually live — a redeploy that silently keeps an old
   environment looks identical from the outside otherwise.
   Only ever reports presence, never a secret's value. */
export async function GET(request) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(cookie))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return NextResponse.json({
    blobTokenPresent: Boolean(token),
    blobTokenLength: token ? token.length : 0,
    blobTokenLooksValid: Boolean(token && token.startsWith('vercel_blob_rw_')),
    blobStoreIdPresent: Boolean(process.env.BLOB_STORE_ID),
    adminPasswordPresent: Boolean(process.env.ADMIN_PASSWORD),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    deployedAt: process.env.VERCEL_DEPLOYMENT_ID || 'unknown',
  });
}
