import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { TesteryLogo } from '@/components/layout/logo';

export const metadata: Metadata = {
  title: 'Testery',
  description: 'Connect with skilled testers for your projects.',
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} antialiased`}>
      <body>
        <div className="flex min-h-screen flex-col">
          <div className="flex items-center container">
             <Link href="/" className="hidden items-center space-x-2 md:flex mr-6">
                <TesteryLogo className="h-32 w-auto" />
                <span className="sr-only">Testery</span>
            </Link>
            <div className="flex-1">
              <Header />
            </div>
          </div>
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
