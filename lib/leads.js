import { put, list } from '@vercel/blob';

const LEADS_PREFIX = 'leads/';

export async function addLead({ brand, phone, category }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const lead = { id, brand, phone, category: category || null, createdAt: new Date().toISOString() };
  await put(`${LEADS_PREFIX}${id}.json`, JSON.stringify(lead), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  return lead;
}

export async function listLeads() {
  const { blobs } = await list({ prefix: LEADS_PREFIX, limit: 1000 });
  const leads = await Promise.all(
    blobs.map(async (b) => {
      const res = await fetch(b.url, { cache: 'no-store' });
      return res.ok ? res.json() : null;
    })
  );
  return leads.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
