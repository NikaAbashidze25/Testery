
'use client';

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The h-screen and overflow-hidden here are critical to prevent page scroll.
  return (
    <div className="h-screen bg-background overflow-hidden">{children}</div>
  );
}
