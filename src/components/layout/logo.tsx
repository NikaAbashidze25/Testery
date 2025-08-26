
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <Image 
            src="/logo-dark.png" 
            alt="Testery Logo" 
            width={150} 
            height={40}
            className={cn("w-auto", className)} 
            data-ai-hint="logo dark" 
        />
    );
}
