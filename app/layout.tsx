import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Gym Paradise — Your dream gym',
  description: 'Build, customise, and explore your own private gym on your phone or laptop.',
  appleWebApp: { capable: true, title: 'Gym Paradise', statusBarStyle: 'black-translucent' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#101115' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
