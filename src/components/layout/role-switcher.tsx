
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function RoleSwitcher() {
    const pathname = usePathname();

    const isClientView = pathname.startsWith('/profile/my-projects') || pathname.startsWith('/projects/post');
    const isTesterView = pathname.startsWith('/projects') && !pathname.startsWith('/projects/post');
    
    return (
        <div className="flex items-center gap-2 rounded-lg bg-muted p-1">
            <Link 
                href="/projects" 
                className={cn(
                    "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                    isTesterView ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                )}
            >
                Find Projects
            </Link>
            <Link 
                href="/profile/my-projects" 
                className={cn(
                    "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                    isClientView ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                )}
            >
                My Projects
            </Link>
        </div>
    );
}
