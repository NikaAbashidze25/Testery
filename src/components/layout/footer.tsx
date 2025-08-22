import Link from 'next/link';
import { TesteryLogo } from './logo';

export function Footer() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <TesteryLogo />
          <span className="sr-only">Testery</span>
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
