
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <Image
            src="/logo.png"
            alt="Testery Logo"
            width={300}
            height={83}
            className={cn("h-[140px] w-auto", className)}
            priority
        />
    );
}
