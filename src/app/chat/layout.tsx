
'use client';

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The h-screen and overflow-hidden here are critical to prevent page scroll.
  return (
    <div className="h-[calc(100vh-4rem)] bg-background overflow-hidden">{children}</div>
  );
}

    