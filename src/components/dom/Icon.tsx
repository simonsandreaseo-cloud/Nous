import { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface IconProps {
    icon: LucideIcon;
    className?: string;
    size?: number | string;
}

export function Icon({ icon: IconComponent, className, size = 20 }: IconProps) {
    return (
        <IconComponent
            size={size}
            className={cn("stroke-1.5", className)}
        />
    );
}
