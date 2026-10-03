import { notFound } from 'next/navigation';

// Unmatched paths in a served locale keep that locale's layout and 404.
export default function UnmatchedPage() {
  notFound();
}
