import { notFound } from 'next/navigation';
import { getConfig } from '@/lib/blobConfig';
import { viewForSlug } from '@/lib/slugs';
import PortfolioView from '../PortfolioView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const config = await getConfig();
  const view = viewForSlug(config.categories, slug);
  if (!view || view === 'home') return {};
  const cat = config.categories.find((c) => c.id === view);
  return { title: `${cat.navLabel} | SIRIAI Portfolio` };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const config = await getConfig();
  const view = viewForSlug(config.categories, slug);
  if (!view) notFound();
  return <PortfolioView config={config} initialView={view} />;
}
