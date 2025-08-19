import { cn } from "@/lib/utils";

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 200 55"
            className={cn("h-8 w-auto", className)}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <text
                fontFamily="Inter, sans-serif"
                fontSize="40"
                fontWeight="bold"
                y="35"
            >
                <tspan fill="#2D3748">Test</tspan>
                <tspan fill="#4FADC8" x="80">ery</tspan>
            </text>
            <path d="M2 42 C 22 52, 42 32, 62 42 S 102 52, 122 42" stroke="#4FADC8" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M65 48 C 85 58, 105 38, 125 48 S 165 58, 185 48" stroke="#4FADC8" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
    )
}
