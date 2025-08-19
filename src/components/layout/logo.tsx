import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <Image
            src="/logo.png"
            alt="Testery Logo"
            width={240}
            height={66}
            className={cn("h-[56px] w-auto", className)}
            priority
        />
    );
}
