
'use client';

import { SidebarProvider } from '@/components/ui/sidebar';

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="h-screen bg-background overflow-hidden">{children}</div>
    </SidebarProvider>
  );
}
