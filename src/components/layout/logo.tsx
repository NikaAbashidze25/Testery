
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <div className={cn("relative", className)}>
            <Image 
                src="/logo-light.png" 
                alt="Testery Logo" 
                width={150} 
                height={40}
                className="block dark:hidden" 
                data-ai-hint="logo light" 
            />
            <Image 
                src="/logo-dark.png" 
                alt="Testery Logo" 
                width={150} 
                height={40}
                className="hidden dark:block midnight:hidden" 
                data-ai-hint="logo dark" 
            />
             <Image 
                src="/logo-midnight.png" 
                alt="Testery Logo" 
                width={150} 
                height={40}
                className="hidden midnight:block" 
                data-ai-hint="logo dark" 
            />
        </div>
    );
}
