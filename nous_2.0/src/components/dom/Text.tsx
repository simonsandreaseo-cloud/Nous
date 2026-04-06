import { ElementType } from "react";
import { cn } from "@/utils/cn";

interface TextProps {
    as?: ElementType;
    variant?: "h1" | "h2" | "h3" | "body" | "caption" | "label";
    className?: string;
    children: React.ReactNode;
}

export function Text({ as, variant = "body", className, children }: TextProps) {
    const Component = (as || (variant.startsWith("h") ? variant : "p")) as any;

    return (
        <Component
            className={cn(
                "text-foreground antialiased",
                {
                    "text-6xl md:text-8xl font-bold tracking-tighter": variant === "h1",
                    "text-4xl md:text-5xl font-semibold tracking-tight": variant === "h2",
                    "text-2xl font-medium tracking-normal": variant === "h3",
                    "text-base leading-relaxed text-gray-600": variant === "body",
                    "text-xs uppercase tracking-widest text-gray-500 font-semibold":
                        variant === "caption",
                    "text-sm font-medium": variant === "label",
                },
                className
            )}
        >
            {children}
        </Component>
    );
}
