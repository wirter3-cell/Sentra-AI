import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter-tight';
import '@fontsource/jetbrains-mono/400.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nurun · Clean energy, engineered for the desert',
  description:
    'Nurun delivers integrated clean energy and intelligent mobility: solar EPC, battery energy storage and EV charging, engineered for harsh desert conditions.',
  openGraph: {
    title: 'Nurun · Clean energy, engineered for the desert',
    description: 'Solar, storage and EV charging as one integrated platform. A Desert Technologies company.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#07110f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
