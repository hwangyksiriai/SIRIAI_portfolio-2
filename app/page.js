import { redirect } from 'next/navigation';
import { getConfig } from '@/lib/blobConfig';
import { pathForView } from '@/lib/slugs';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  // The landing view is the first nav category (Beauty) rather than the
  // Home hero, redirected so the address bar shows its real path.
  const config = await getConfig();
  const first = config.categories.find((cat) => !cat.hideFromNav);
  redirect(first ? pathForView(first.id) : '/home');
}
