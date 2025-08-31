
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { usePathname } from 'next/navigation';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isChatPage = pathname.startsWith('/chat');

  // Metadata needs to be handled differently for client components
  // For simplicity, we'll keep it static here but it could be moved
  // to a specific layout or page component if dynamic titles are needed.
  if (typeof window !== 'undefined') {
    document.title = 'Testery';
  }


  return (
    <html lang="en" className={`${inter.className} antialiased`} suppressHydrationWarning>
      <body>
         <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            value={{
              light: 'light',
              midnight: 'midnight',
            }}
          >
            <div className="flex min-h-screen flex-col">
              {!isChatPage && <Header />}
              <main className="flex-1">{children}</main>
              {!isChatPage && <Footer />}
            </div>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
