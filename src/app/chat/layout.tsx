
'use client';

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen bg-background overflow-hidden">{children}</div>
  );
}
