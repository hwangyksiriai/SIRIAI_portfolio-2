import { NextResponse } from 'next/server';
import { addLead } from '@/lib/leads';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const brand = (body?.brand || '').trim();
  const phone = (body?.phone || '').trim();
  if (!brand || !phone) {
    return NextResponse.json({ error: 'brand and phone are required' }, { status: 400 });
  }
  const category = typeof body?.category === 'string' ? body.category.slice(0, 100) : null;
  await addLead({ brand: brand.slice(0, 200), phone: phone.slice(0, 50), category });
  return NextResponse.json({ ok: true });
}
