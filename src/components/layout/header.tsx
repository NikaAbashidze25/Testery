import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, TestTube2 } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <TestTube2 className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">TestLink</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/jobs" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Find a Job
            </Link>
            <Link href="/jobs/post" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Post a Job
            </Link>
            <Link href="/#features" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Features
            </Link>
          </nav>
        </div>

        <div className="flex-1 md:hidden">
            <Link href="/" className="flex items-center space-x-2">
                <TestTube2 className="h-6 w-6 text-primary" />
                <span className="font-bold">TestLink</span>
            </Link>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col space-y-4 p-4">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                  <span className="font-bold">Navigation</span>
                </Link>
                <nav className="flex flex-col space-y-3">
                  <Link href="/jobs" className="text-lg">Find a Job</Link>
                  <Link href="/jobs/post" className="text-lg">Post a Job</Link>
                  <Link href="/#features" className="text-lg">Features</Link>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden flex-1 items-center justify-end space-x-4 md:flex">
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
