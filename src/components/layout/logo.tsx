import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <Image
            src="/logo.png"
            alt="Testery Logo"
            width={170}
            height={47}
            className={cn("h-14 w-auto", className)}
            priority
        />
    );
}
