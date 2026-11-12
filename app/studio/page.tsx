import type { Metadata } from 'next';
import StudioClient from '@/components/studio/StudioClient';

export const metadata: Metadata = { title: 'Nurun · Model studio', robots: { index: false } };

export default function StudioPage() {
  return <StudioClient />;
}
