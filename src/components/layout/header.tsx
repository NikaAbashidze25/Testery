
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, User, LogOut, Search, FilePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { TesteryLogo } from './logo';
import { Skeleton } from '../ui/skeleton';

export function Header() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  const renderUserControls = () => {
    if (isAuthLoading) { 
      return <Skeleton className="h-8 w-8 rounded-full" />
    }

    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <>
        <Button variant="ghost" asChild>
          <Link href="/login">Log In</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Sign Up</Link>
        </Button>
      </>
    );
  };
  
  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  const renderNavLinks = (isMobile = false) => {
    if (isAuthLoading) {
      return null;
    }
    const commonClass = "transition-colors hover:text-foreground/80 text-foreground/60";
    const mobileClass = "flex items-center gap-2 text-lg py-2";

    const linkProps = {
        onClick: isMobile ? handleLinkClick : undefined
    };

    if (user) {
        return (
            <>
                <Link href="/projects" className={isMobile ? mobileClass : commonClass} {...linkProps}>
                   {isMobile && <Search className="h-4 w-4" />} Find a Project
                </Link>
                <Link href="/projects/post" className={isMobile ? mobileClass : commonClass} {...linkProps}>
                   {isMobile && <FilePlus className="h-4 w-4" />} Post a Project
                </Link>
            </>
        );
    }
    return (
        <>
            <Link href="/projects" className={isMobile ? mobileClass : commonClass} {...linkProps}>
               {isMobile && <Search className="h-4 w-4" />} Find a Project
            </Link>
             <Link href="/#features" className={isMobile ? mobileClass : commonClass} {...linkProps}>
              Features
            </Link>
            <Link href="/about" className={isMobile ? mobileClass : commonClass} {...linkProps}>
              About Us
            </Link>
        </>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-auto flex items-center">
           <Link href="/" className="relative z-10" aria-label="Homepage" style={{clipPath: 'url(#logo-clip-path)'}}>
            <svg height="0" width="0">
              <defs>
                  <clipPath id="logo-clip-path" clipPathUnits="objectBoundingBox">
                  <path d="M0.01,0.22 L0.01,0.77 C0.01,0.77 0.02,0.78 0.02,0.78 L0.13,0.78 C0.13,0.78 0.14,0.77 0.14,0.77 L0.14,0.36 C0.14,0.36 0.13,0.35 0.13,0.35 L0.02,0.35 C0.02,0.35 0.01,0.36 0.01,0.36 M0.16,0.35 L0.27,0.35 C0.27,0.35 0.28,0.36 0.28,0.36 L0.28,0.77 C0.28,0.77 0.27,0.78 0.27,0.78 L0.16,0.78 C0.16,0.78 0.15,0.77 0.15,0.77 L0.15,0.36 C0.15,0.36 0.16,0.35 0.16,0.35 M0.3,0.35 L0.4,0.35 C0.4,0.35 0.41,0.36 0.41,0.36 L0.41,0.64 C0.41,0.64 0.41,0.64 0.41,0.65 L0.44,0.77 C0.44,0.78 0.44,0.78 0.43,0.78 L0.4,0.78 C0.4,0.78 0.4,0.78 0.39,0.77 L0.37,0.67 C0.37,0.66 0.37,0.66 0.37,0.66 L0.33,0.66 C0.33,0.66 0.32,0.66 0.32,0.67 L0.3,0.77 C0.3,0.78 0.29,0.78 0.29,0.78 L0.26,0.78 C0.25,0.78 0.25,0.78 0.25,0.77 L0.28,0.65 C0.28,0.64 0.28,0.64 0.28,0.64 L0.29,0.36 C0.29,0.36 0.3,0.35 0.3,0.35 M0.45,0.35 L0.55,0.35 C0.55,0.35 0.56,0.36 0.56,0.36 L0.56,0.42 C0.56,0.42 0.55,0.43 0.55,0.43 L0.49,0.43 C0.49,0.43 0.48,0.42 0.48,0.42 L0.48,0.36 C0.48,0.36 0.49,0.35 0.49,0.35 M0.49,0.5 L0.55,0.5 C0.55,0.5 0.56,0.51 0.56,0.51 L0.56,0.77 C0.56,0.77 0.55,0.78 0.55,0.78 L0.49,0.78 C0.49,0.78 0.48,0.77 0.48,0.77 L0.48,0.51 C0.48,0.51 0.49,0.5 0.49,0.5 M0.58,0.35 L0.68,0.35 C0.68,0.35 0.69,0.36 0.69,0.36 L0.69,0.77 C0.69,0.77 0.68,0.78 0.68,0.78 L0.58,0.78 C0.58,0.78 0.57,0.77 0.57,0.77 L0.57,0.36 C0.57,0.36 0.58,0.35 0.58,0.35 M0.7,0.35 L0.81,0.35 C0.81,0.35 0.82,0.36 0.82,0.36 L0.82,0.43 C0.82,0.43 0.81,0.44 0.81,0.44 L0.74,0.44 C0.74,0.44 0.73,0.43 0.73,0.43 L0.73,0.36 C0.73,0.36 0.74,0.35 0.74,0.35 M0.74,0.51 L0.81,0.51 C0.81,0.51 0.82,0.52 0.82,0.52 L0.82,0.77 C0.82,0.77 0.81,0.78 0.81,0.78 L0.7,0.78 C0.7,0.78 0.69,0.77 0.69,0.77 L0.69,0.52 C0.69,0.52 0.7,0.51 0.7,0.51 M0.83,0.35 L0.94,0.35 C0.94,0.35 0.95,0.36 0.95,0.36 L0.95,0.77 C0.95,0.77 0.94,0.78 0.94,0.78 L0.83,0.78 C0.83,0.78 0.82,0.77 0.82,0.77 L0.82,0.36 C0.82,0.36 0.83,0.35 0.83,0.35 M0.96,0.35 L1,0.35 C1,0.35 1,0.36 1,0.36 L0.99,0.64 C0.99,0.64 0.99,0.65 0.99,0.65 L0.96,0.77 C0.96,0.78 0.95,0.78 0.95,0.78 L0.92,0.78 C0.91,0.78 0.91,0.78 0.91,0.77 L0.93,0.67 C0.93,0.66 0.94,0.66 0.94,0.66 L0.98,0.66 C0.98,0.66 0.99,0.66 0.99,0.65 L1,0.36 C1,0.36 1,0.35 1,0.35" />
                  </clipPath>
              </defs>
            </svg>
                <TesteryLogo className="h-32 w-auto" />
            </Link>
        </div>
        
        <div className="flex items-center md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2 h-10 w-10">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                </SheetHeader>
                 <Link href="/" className="mr-6 flex items-center space-x-2" onClick={handleLinkClick}>
                    <TesteryLogo className="h-20 w-auto" />
                </Link>
                <div className="flex flex-col space-y-4 p-4">
                <nav className="flex flex-col space-y-3">
                    {renderNavLinks(true)}
                </nav>
                </div>
            </SheetContent>
            </Sheet>
        </div>
       
        <div className="hidden flex-1 items-center justify-center space-x-6 text-sm font-medium md:flex">
             <nav className="flex items-center space-x-6 text-sm font-medium">
                {renderNavLinks()}
            </nav>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">{renderUserControls()}</nav>
        </div>
      </div>
    </header>
  );
}
