import type { Metadata } from 'next';
import { Syne, DM_Sans } from 'next/font/google';

import './globals.css';
import PostHogProvider from '@/components/PostHogProvider';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'OpenSora — AI Video Generation',
  description:
    'Create stunning AI-generated videos from text prompts. The #1 AI content platform — smarter, faster, and more creative than anything else.',
  openGraph: {
    title: 'OpenSora — AI Video Generation',
    description: 'Create stunning AI-generated videos from text prompts.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
