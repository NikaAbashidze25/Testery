
'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedSectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function AnimatedSection({ children, className, ...props }: AnimatedSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(section);
        }
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
      }
    );

    observer.observe(section);

    return () => {
      if (section) {
        observer.unobserve(section);
      }
    };
  }, [hasMounted]);

  if (!hasMounted) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className={cn(
        'transition-all duration-700 ease-out',
        isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-4',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
