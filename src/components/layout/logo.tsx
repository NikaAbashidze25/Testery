
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center justify-center font-bold text-lg h-8 w-auto", className)}>
         Testery
        </div>
    );
}
