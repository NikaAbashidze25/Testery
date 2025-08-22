
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center justify-center font-bold text-lg h-8 w-auto", className)}>
            <Image src="/logo.png" alt="Testery Logo" width={100} height={32} className="h-8 w-auto" priority />
        </div>
    );
}
