import { put, list } from '@vercel/blob';
import initialConfig from './initialConfig.json' with { type: 'json' };
import { foldContinuations } from './foldContinuations';

const CONFIG_PATHNAME = 'config/site.json';

/* Throws if the saved config can't be read. Callers that must not confuse
   "nothing saved yet" with "the read failed" use this directly: the admin
   loads a config only to write it straight back, so handing it the bundled
   sample data after a failed read would overwrite the real one. */
export async function loadConfig() {
  const { blobs } = await list({ prefix: CONFIG_PATHNAME, limit: 1 });
  const match = blobs.find((b) => b.pathname === CONFIG_PATHNAME);
  if (!match) return { config: foldContinuations(initialConfig), source: 'seed' };

  const res = await fetch(match.url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`config blob fetch failed: ${res.status}`);
  return { config: foldContinuations(await res.json()), source: 'blob' };
}

/* The public site would rather show the bundled content than nothing. */
export async function getConfig() {
  try {
    const { config } = await loadConfig();
    return config;
  } catch (err) {
    console.error('getConfig failed, falling back to initialConfig', err);
    return foldContinuations(initialConfig);
  }
}

export async function saveConfig(config) {
  const body = JSON.stringify(config, null, 2);
  await put(CONFIG_PATHNAME, body, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  });
  return config;
}
