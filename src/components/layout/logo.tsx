
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center justify-center font-bold text-lg h-32 w-auto", className)}>
            <Image src="/logo.png" alt="Testery Logo" width={400} height={128} className="h-32 w-auto" />
        </div>
    );
}
