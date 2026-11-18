/* Helpers for moving a config between Blob stores: find the uploaded files
   it points at, and swap those URLs for their copies. Bundled paths like
   /media/... are not Blob files and are left alone. */

const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;

export function isBlobUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && BLOB_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

export function collectBlobUrls(config) {
  const found = new Set();
  (function walk(node) {
    if (isBlobUrl(node)) found.add(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') Object.values(node).forEach(walk);
  })(config);
  return [...found];
}

export function replaceUrls(config, map) {
  return (function walk(node) {
    if (typeof node === 'string') return map[node] || node;
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]));
    }
    return node;
  })(config);
}
