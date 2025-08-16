import Link from 'next/link';
import { TestTube2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t bg-white">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <TestTube2 className="h-6 w-6 text-primary" />
          <span className="font-bold">Testery</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4 md:mb-0">
          <Link href="/about" className="hover:text-foreground">About Us</Link>
          <Link href="/contact" className="hover:text-foreground">Contact</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        </div>
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Testery. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
