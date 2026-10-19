import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage, legalMetadata } from '@/components/LegalPage';
import { isLocale } from '@/lib/api';

/** Prérendue par locale, sans appel à l'API ; 24 h de filet, comme les autres pages. */
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps<'/[locale]/privacy'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return legalMetadata(locale, 'privacy');
}

/** Confidentialité (web #16) : ce que le site collecte, Google Analytics, journaux du serveur, droits du visiteur. */
export default async function PrivacyPage({ params }: PageProps<'/[locale]/privacy'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <LegalPage locale={locale} page="privacy" />;
}
