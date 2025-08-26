
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <>
            {/* Light mode logo */}
            <Image 
                src="/logo.png" 
                alt="Testery Logo" 
                width={150} 
                height={40}
                className={cn("w-auto dark:hidden", className)} 
                data-ai-hint="logo" 
            />
            {/* Dark mode logo */}
            <Image 
                src="/logo-dark.png" 
                alt="Testery Logo" 
                width={150} 
                height={40}
                className={cn("w-auto hidden dark:block", className)} 
                data-ai-hint="logo dark" 
            />
        </>
    );
}
