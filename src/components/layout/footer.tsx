
import Link from 'next/link';
import { TesteryLogo } from './logo';
import { Facebook, Instagram, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container grid grid-cols-1 md:grid-cols-4 gap-8 py-12">
        {/* Column 1: Logo & Copyright */}
        <div className="flex flex-col gap-4 items-start">
           <Link href="/" aria-label="Homepage">
            <TesteryLogo className="h-20 w-auto" />
          </Link>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Testery. All rights reserved.
          </p>
        </div>

        {/* Column 2: Legal */}
        <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                 <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
                 <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            </div>
        </div>
        
        {/* Column 3: Company */}
        <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Company</h3>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                 <Link href="/about" className="hover:text-foreground">About Us</Link>
                 <Link href="/contact" className="hover:text-foreground">Contact</Link>
            </div>
        </div>

        {/* Column 4: Social */}
         <div className="flex flex-col gap-4 items-start md:items-end">
            <h3 className="text-sm font-semibold text-foreground">Connect With Us</h3>
            <div className="flex gap-4">
                <a href="https://www.facebook.com/profile.php?id=61579247797622" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Facebook">
                    <Facebook className="h-6 w-6" />
                </a>
                <a href="https://www.instagram.com/testery_global/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Instagram">
                    <Instagram className="h-6 w-6" />
                </a>
                 <a href="https://www.linkedin.com/company/tsetery/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="LinkedIn">
                    <Linkedin className="h-6 w-6" />
                </a>
            </div>
        </div>
      </div>
    </footer>
  );
}
