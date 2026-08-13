import type { Metadata } from 'next';
import { DM_Serif_Display, Courier_Prime } from 'next/font/google';
import './globals.css';

const dmSerif = DM_Serif_Display({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Postcard from Goa — HH Goa 2026 Frame Generator',
  description:
    'Upload your photo, get a vintage Goa postcard or passport spread, stamp it, and share on X. #FrameInGoa',
  openGraph: {
    title: 'Postcard from Goa — HH Goa 2026',
    description: 'Upload your photo, get a vintage Goa postcard or passport spread. #FrameInGoa',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${courierPrime.variable}`}>
      <body>{children}</body>
    </html>
  );
}
