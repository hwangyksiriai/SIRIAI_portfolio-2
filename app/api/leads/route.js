import { NextResponse } from 'next/server';
import { addLead, listLeads } from '@/lib/leads';
import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const brand = (body?.brand || '').trim();
  const phone = (body?.phone || '').trim();
  if (!brand || !phone) {
    return NextResponse.json({ error: 'brand and phone are required' }, { status: 400 });
  }
  const category = typeof body?.category === 'string' ? body.category.slice(0, 100) : null;
  const lead = await addLead({ brand: brand.slice(0, 200), phone: phone.slice(0, 50), category });
  return NextResponse.json({ ok: true, id: lead.id });
}

export async function GET(request) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(cookie))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const leads = await listLeads();
  return NextResponse.json({ leads });
}
