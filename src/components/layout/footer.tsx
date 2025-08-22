
import Link from 'next/link';
import { TesteryLogo } from './logo';

export function Footer() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-4">
            <TesteryLogo className="h-20 w-auto" />
            <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Testery. All rights reserved.
            </p>
        </div>
        <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground">About Us</Link>
          <Link href="/contact" className="hover:text-foreground">Contact</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
