import { cn } from "@/lib/utils";

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 160 160"
            className={cn("h-6 w-6", className)}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#3A3F51', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#4FADC8', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
            <circle cx="80" cy="80" r="75" stroke="url(#circleGradient)" strokeWidth="10" />
            <text
                x="50%"
                y="50%"
                dominantBaseline="central"
                textAnchor="middle"
                fontSize="40"
                fontFamily="Inter, sans-serif"
                fontWeight="bold"
            >
                <tspan fill="#2D3748">Te</tspan>
                <tspan fill="#4FADC8" dx="-5">s</tspan>
                <tspan fill="#2D3748">t</tspan>
                <tspan fill="#4FADC8">e</tspan>
                <tspan fill="#2D3748">r</tspan>
                <tspan fill="#4FADC8">y</tspan>
            </text>
             <g transform="translate(45, 100)">
                <rect x="0" y="0" width="8" height="4" rx="2" fill="#4FADC8" />
                <rect x="12" y="0" width="20" height="4" rx="2" fill="#4FADC8" />
                <rect x="36" y="0" width="20" height="4" rx="2" fill="#4FADC8" />
            </g>
        </svg>
    )
}
