
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <>
            <Image 
                src="/logo-light.png" 
                alt="Testery Logo" 
                width={150} 
                height={48} 
                className={cn("w-auto dark:hidden", className)} 
                priority
                data-ai-hint="logo light"
            />
            <Image 
                src="/logo-dark.png" 
                alt="Testery Logo" 
                width={150} 
                height={48} 
                className={cn("w-auto hidden dark:block", className)} 
                priority
                data-ai-hint="logo dark"
            />
        </>
    );
}
