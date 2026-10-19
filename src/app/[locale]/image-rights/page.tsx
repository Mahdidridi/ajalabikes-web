import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage, legalMetadata } from '@/components/LegalPage';
import { isLocale } from '@/lib/api';

/** Prérendue par locale, sans appel à l'API ; 24 h de filet, comme les autres pages. */
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps<'/[locale]/image-rights'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return legalMetadata(locale, 'image-rights');
}

/**
 * Droits des images et retrait (web #16) : la posture « tolérée et documentée » du 3 septembre 2026 — photos des
 * constructeurs, non retouchées, lien vers la marque, retrait sous 48 heures (réponse du fondateur du 16 octobre 2026).
 */
export default async function ImageRightsPage({ params }: PageProps<'/[locale]/image-rights'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <LegalPage locale={locale} page="image-rights" />;
}
