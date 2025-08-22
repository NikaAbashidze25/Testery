
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <Image
            src="/logo.png"
            alt="Testery Logo"
            width={140}
            height={48}
            className={cn("h-8 w-auto", className)}
            priority
        />
    );
}
