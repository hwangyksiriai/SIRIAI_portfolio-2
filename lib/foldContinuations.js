/* Overflow clips used to live in their own "continuation" categories —
   cat-beauty-2 … cat-beauty-9 alongside cat-beauty — hidden from the nav.
   The site already stitched them back together when rendering, but the admin
   listed each page separately, so the two disagreed about what a category
   contains. Folding them into the parent on read makes both sides see one
   category with every clip in it; the next admin save persists the folded
   shape, so this quietly migrates old data. */

const CONTINUATION_ID = /^(.+)-(\d+)$/;

export function foldContinuations(config) {
  const categories = config?.categories;
  if (!Array.isArray(categories)) return config;

  const ids = new Set(categories.map((cat) => cat.id));
  const pagesByParent = new Map();

  // Kept in the order the pages appear in the config — that is the order the
  // feed already rendered them in, and it is what admin drag-reordering
  // writes back, so folding must not reshuffle anything.
  for (const cat of categories) {
    const match = CONTINUATION_ID.exec(cat.id);
    if (!match || !ids.has(match[1])) continue;
    const pages = pagesByParent.get(match[1]) || [];
    pages.push(cat);
    pagesByParent.set(match[1], pages);
  }

  if (pagesByParent.size === 0) return config;

  const folded = structuredClone(config);
  const byId = new Map(folded.categories.map((cat) => [cat.id, cat]));
  const absorbed = new Set();

  for (const [parentId, pages] of pagesByParent) {
    const extra = pages.flatMap((page) => page.clips || []);
    pages.forEach((page) => absorbed.add(page.id));
    if (extra.length === 0) continue;

    const parent = byId.get(parentId);
    const regions = Array.isArray(parent.regions) ? parent.regions : null;
    if (regions && regions.length > 0) {
      // The feed rendered these alongside the first populated region, so
      // that is where they belong once merged.
      const target = regions.find((r) => (r.clips || []).length > 0) || regions[0];
      target.clips = [...(target.clips || []), ...extra];
    } else {
      parent.clips = [...(parent.clips || []), ...extra];
    }
  }

  folded.categories = folded.categories.filter((cat) => !absorbed.has(cat.id));
  return folded;
}
