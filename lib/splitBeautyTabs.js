/* Beauty used to split into 국내/해외. It is now 색조/스킨/해외: the old 국내
   tab becomes the 색조 (makeup) feed and skincare gets its own tab between it
   and 해외. The live config lives in Blob, not in this repo, so the rename is
   applied on read; the next admin save persists the new shape, after which
   there is no 'domestic' region left and this does nothing. Which clips are
   skincare is decided in the admin — nothing is moved here. */

export function splitBeautyTabs(config) {
  const beauty = config?.categories?.find((cat) => cat.id === 'cat-beauty');
  const regions = Array.isArray(beauty?.regions) ? beauty.regions : null;
  if (!regions || regions.some((r) => r.key === 'skin')) return config;
  const domesticIndex = regions.findIndex((r) => r.key === 'domestic');
  if (domesticIndex === -1) return config;

  const next = structuredClone(config);
  const nextRegions = next.categories.find((cat) => cat.id === 'cat-beauty').regions;
  nextRegions[domesticIndex] = { ...nextRegions[domesticIndex], key: 'color', label: '색조' };
  nextRegions.splice(domesticIndex + 1, 0, { key: 'skin', label: '스킨', clips: [] });
  return next;
}
