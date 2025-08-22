
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <Image src="https://placehold.co/300x96.png" alt="Testery Logo" width={300} height={96} className={cn("w-auto", className)} priority data-ai-hint="logo placeholder" />
    );
}
