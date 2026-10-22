import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage, legalMetadata } from '@/components/LegalPage';
import { isLocale } from '@/lib/api';

/** Prérendue par locale, sans appel à l'API ; 24 h de filet, comme les autres pages. */
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return legalMetadata(locale, 'contact');
}

/** Contact et informations légales (web #16) : une adresse e-mail, pas de formulaire, le responsable de la publication. */
export default async function ContactPage({ params }: PageProps<'/[locale]/contact'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <LegalPage locale={locale} page="contact" />;
}
