import { cn } from "@/utils/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-full transition-all duration-300 font-medium",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    {
                        "bg-foreground text-background hover:bg-opacity-90 active:scale-95":
                            variant === "primary",
                        "bg-color-fog-gray text-foreground hover:bg-gray-200":
                            variant === "secondary",
                        "bg-transparent hover:bg-black/5": variant === "ghost",
                        "border border-foreground/20 hover:border-foreground/50": variant === "outline",
                        "h-8 px-4 text-xs": size === "sm",
                        "h-10 px-6 text-sm": size === "md",
                        "h-12 px-8 text-base": size === "lg",
                    },
                    className
                )}
                {...props}
            />
        );
    }
);

Button.displayName = "Button";

export { Button };
