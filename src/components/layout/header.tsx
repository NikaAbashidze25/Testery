
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, User, LogOut, Search, FilePlus, MessageSquare, Briefcase, Send, Bookmark, Bell, CircleUser, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, writeBatch, getDocs, DocumentData, Timestamp } from 'firebase/firestore';
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
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '@/contexts/auth-provider';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
    id: string;
    message: string;
    link: string;
    isRead: boolean;
    createdAt: Timestamp;
    title: string;
}

export function Header() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef, 
            where('recipientId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userNotifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notification));
            setNotifications(userNotifications);
        }, (error) => {
          console.error("Error fetching notifications: ", error);
        });

        return () => unsubscribe();
    } else {
        setNotifications([]);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { isRead: true });
  };
  
  const markAllAsRead = async () => {
    if (!user) return;
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if(unreadNotifications.length === 0) return;
    const batch = writeBatch(db);
    unreadNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, { isRead: true });
    });
    await batch.commit();
  };

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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderUserControls = () => {
    if (isAuthLoading || !hasMounted) {
      return <Skeleton className="h-8 w-8 rounded-full" />;
    }

    if (user) {
      return (
        <>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/chat">
                <MessageSquare className="h-5 w-5" />
                <span className="sr-only">My Chats</span>
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 text-xs">{unreadCount > 9 ? '9+' : unreadCount}</Badge>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                 <DropdownMenuLabel className="flex justify-between items-center p-2">
                    Notifications
                    {unreadCount > 0 && (
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={markAllAsRead}>Mark all as read</Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground p-4">
                        No new notifications
                    </div>
                ) : (
                   notifications.map(notification => (
                    <DropdownMenuItem 
                        key={notification.id} 
                        className={cn("flex items-start gap-3 p-3 cursor-pointer border-l-2", !notification.isRead ? "border-primary bg-accent/50" : "border-transparent")}
                        onClick={() => {
                            markAsRead(notification.id);
                            router.push(notification.link);
                        }}
                    >
                         {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          )}
                        <div className={cn("flex-1", notification.isRead && "pl-3")}>
                            <p className="text-sm font-medium leading-snug">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}</p>
                        </div>
                    </DropdownMenuItem>
                   ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8 rounded-md">
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
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/chat">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>My Chats</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">My Activity</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/profile/my-projects">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>My Projects</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/my-applications">
                    <Send className="mr-2 h-4 w-4" />
                    <span>My Applications</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/saved-projects">
                    <Bookmark className="mr-2 h-4 w-4" />
                    <span>Saved Projects</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </>
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
    const commonClass = "transition-colors hover:text-foreground/80 text-foreground/60";
    const mobileClass = "flex items-center gap-2 text-lg py-2";

    const linkProps = {
        onClick: isMobile ? handleLinkClick : undefined
    };

    if (isAuthLoading) {
        return (
            <>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-6 w-20" />
            </>
        )
    }

    if (user) {
        return (
            <>
                <Link href="/projects" className={isMobile ? mobileClass : commonClass} {...linkProps}>
                   {isMobile && <Search className="h-4 w-4" />} Find a Project
                </Link>
                <Link href="/projects/post" className={isMobile ? mobileClass : commonClass} {...linkProps}>
                   {isMobile && <FilePlus className="h-4 w-4" />} Post a Project
                </Link>
                 <Link href="/about" className={isMobile ? mobileClass : commonClass} {...linkProps}>
                  About Us
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
           <Link 
              href="/" 
              className="inline-block" 
              aria-label="Homepage"
            >
              <TesteryLogo className="h-10 w-auto" />
            </Link>
        </div>
        
        <div className="flex items-center md:hidden">
            {hasMounted && (
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
                        <TesteryLogo className="h-10 w-auto" />
                    </Link>
                    <div className="flex flex-col space-y-4 p-4">
                    <nav className="flex flex-col space-y-3">
                        {renderNavLinks(true)}
                    </nav>
                    </div>
                </SheetContent>
                </Sheet>
            )}
        </div>
       
        <div className="hidden flex-1 items-center justify-center space-x-6 text-sm font-medium md:flex">
             <nav className="flex items-center space-x-6 text-sm font-medium">
                {hasMounted && renderNavLinks()}
            </nav>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-1">
          <ThemeToggle />
          <nav className="flex items-center space-x-1">
            {hasMounted && renderUserControls()}
          </nav>
        </div>
      </div>
    </header>
  );
}
