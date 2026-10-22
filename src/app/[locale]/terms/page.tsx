import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage, legalMetadata } from '@/components/LegalPage';
import { isLocale } from '@/lib/api';

/** Prérendue par locale, sans appel à l'API ; 24 h de filet, comme les autres pages. */
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps<'/[locale]/terms'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return legalMetadata(locale, 'terms');
}

/** Conditions d'utilisation (web #16) : un site d'information, pas un magasin ; prix constructeur américain ; « tel quel ». */
export default async function TermsPage({ params }: PageProps<'/[locale]/terms'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <LegalPage locale={locale} page="terms" />;
}
