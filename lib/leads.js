const SHEET_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbzYpUnCe0bB1cAUXrGKB61MzyiFL1GkU3cTU-xGEu8DFSW8FGKnioMFKnAWxoDNdRmNIg/exec';

export async function addLead({ brand, phone, category }) {
  const lead = { brand, phone, category: category || null, createdAt: new Date().toISOString() };
  const res = await fetch(SHEET_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  });
  if (!res.ok) throw new Error('sheet webhook failed');
  return lead;
}
