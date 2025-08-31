'use client';

import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Footer } from './footer';

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isChatPage = pathname.startsWith('/chat');
    
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            {!isChatPage && <Footer />}
        </div>
    );
}
