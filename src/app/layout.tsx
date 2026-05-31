import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const siteUrl = 'https://stackmap.org';
const siteName = 'Stackmap';
const siteDescription =
  'A free, open source tool that helps charities, social enterprises, and councils map their technology — systems, costs, risks, and who\u2019s responsible — in about an hour.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Stackmap — Architecture mapping for social purpose organisations',
    template: '%s | Stackmap',
  },
  description: siteDescription,
  keywords: [
    'technology mapping',
    'architecture mapping',
    'charity technology',
    'social enterprise',
    'council technology',
    'tech stack',
    'open source',
    'TechFreedom',
  ],
  authors: [{ name: 'The Good Ship and Tomcw.xyz' }],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: siteUrl,
    siteName,
    title: 'Stackmap — Map your organisation\u2019s technology',
    description: siteDescription,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Stackmap — Architecture mapping for social purpose organisations',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stackmap — Map your organisation\u2019s technology',
    description: siteDescription,
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content">
          {children}
        </main>
        <Footer />
        <Script
          defer
          data-domain="stackmap.org"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
