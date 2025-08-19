import { cn } from "@/lib/utils";

export function TesteryLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 200 60"
            className={cn("h-8 w-auto", className)}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <text 
                fontFamily="Inter, sans-serif" 
                fontSize="40" 
                fontWeight="bold" 
                y="40"
            >
                <tspan fill="#3A3F51">T</tspan>
                <tspan fill="#3A3F51" x="25">e</tspan>
                <tspan fill="#3A3F51" x="45">s</tspan>
                <tspan fill="#3A3F51" x="63">t</tspan>
                <tspan fill="#4FADC8" x="83">e</tspan>
                <tspan fill="#4FADC8" x="103">r</tspan>
                <tspan fill="#4FADC8" x="120">y</tspan>
            </text>
            <g transform="translate(45, 48)">
                 <rect x="0" y="0" width="8" height="4" rx="2" fill="#4FADC8" />
                 <rect x="12" y="0" width="20" height="4" rx="2" fill="#4FADC8" />
                 <rect x="36" y="0" width="20" height="4" rx="2" fill="#4FADC8" />
                 <circle cx="2" cy="2" r="2" fill="#4FADC8" transform="translate(1, 5)"/>
                 <circle cx="2" cy="2" r="2" fill="#4FADC8" transform="translate(7, 5)"/>
            </g>
        </svg>
    )
}
