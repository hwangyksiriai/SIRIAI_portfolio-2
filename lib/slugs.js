/* Category ids are prefixed ("cat-beauty"); the public URL drops the prefix
   so pages read /beauty, /fashion, /travel. Continuation pages (cat-beauty-2)
   and anything else hidden from the nav get no route of their own — their
   clips already surface inside the parent category's feed. */

export const HOME_SLUG = 'home';

export function slugForView(view) {
  return view === 'home' ? HOME_SLUG : view.replace(/^cat-/, '');
}

export function pathForView(view) {
  return `/${slugForView(view)}`;
}

export function viewForSlug(categories, slug) {
  if (slug === HOME_SLUG) return 'home';
  const match = categories.find(
    (cat) => !cat.hideFromNav && slugForView(cat.id) === slug
  );
  return match ? match.id : null;
}
