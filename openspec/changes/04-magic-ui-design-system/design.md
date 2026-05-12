# Technical Design: 04-magic-ui-design-system

This document outlines the technical implementation of the Magic UI Design System for Nous 3.0, focusing on the "Living UI" principles and performance-first animations.

## 1. Tailwind CSS 4 Configuration (CSS-Native)

In Tailwind 4, we leverage `@theme` blocks directly in `src/app/globals.css`. We will extend the theme with Magic UI specific keyframes and utilities.

### Design: `src/app/globals.css` extensions

```css
@theme inline {
  /* ... existing theme ... */

  /* Magic UI Animations */
  --animation-shimmer: shimmer 2s linear infinite;
  --animation-beam: beam 2s infinite;
  
  @keyframes shimmer {
    from { background-position: 0 0; }
    to { background-position: -200% 0; }
  }

  @keyframes beam {
    from { offset-distance: 0%; }
    to { offset-distance: 100%; }
  }
}

@layer utilities {
  .mask-shimmer {
    mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.2) 20%,
      rgba(0, 0, 0, 0.5) 50%,
      rgba(0, 0, 0, 0.2) 80%
    );
    mask-size: 200% 100%;
  }
}
```

## 2. Shared UI Components (`@nous/ui`)

We will define core components in `src/components/ui` that follow the design system.

### 2.1 `AnimatedTaskCard.tsx`
A card component designed for lists with staggered entrance and responsive spring hover states.

```tsx
"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnimatedTaskCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  index: number;
}

export const AnimatedTaskCard = ({ 
  children, 
  index, 
  className,
  ...props 
}: AnimatedTaskCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * 0.05, // Stagger effect
      }}
      whileHover={{ 
        scale: 1.02,
        y: -4,
        transition: { type: "spring", stiffness: 400, damping: 10 }
      }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "glass-panel p-4 rounded-xl cursor-pointer relative overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
```

### 2.2 `ShimmerButton.tsx`
A high-performance button with a CSS-driven shimmer effect for active processing states.

```tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn"; // Assuming utility exists

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  shimmerDuration?: string;
  isProcessing?: boolean;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ 
    children, 
    className, 
    shimmerColor = "#ffffff", 
    shimmerSize = "0.05em", 
    shimmerDuration = "2s",
    isProcessing = false,
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative flex items-center justify-center overflow-hidden rounded-full px-6 py-2 font-medium transition-all duration-300",
          "bg-nous-deep-cyan text-white hover:shadow-[0_0_20px_rgba(0,128,128,0.3)]",
          className
        )}
        {...props}
      >
        {/* Shimmer Layer */}
        {isProcessing && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${shimmerColor}40, transparent)`,
              backgroundSize: "200% 100%",
              animation: `shimmer ${shimmerDuration} linear infinite`,
            }}
          />
        )}
        
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";
```

## 3. Global Layout Transitions

We use `AnimatePresence` and a custom `PageTransition` wrapper to handle screen changes smoothly.

### Design: `src/app/layout.tsx` injection

```tsx
// src/components/shared/PageTransition.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
```

Update `RootLayout` in `src/app/layout.tsx` to wrap `{children}` with `<PageTransition>`.

## 4. Framer Settings (System Globals)

To ensure the "Fast but Elastic" feel, we define a set of global spring and easing configurations.

| Feel | Type | Stiffness | Damping | Use Case |
|------|------|-----------|---------|----------|
| **Standard** | `spring` | 260 | 20 | Cards, Modals, Page Transitions |
| **Snappy** | `spring` | 400 | 28 | Icons, Toggles, Hover feedback |
| **Bouncy** | `spring` | 500 | 15 | Error shakes, Success popups |
| **Fluid** | `tween` | `easeOut` | (0.16, 1, 0.3, 1) | Background fades, Color shifts |

### Framer Constants: `src/constants/animations.ts`

```ts
export const TRANSITIONS = {
  standard: {
    type: "spring",
    stiffness: 260,
    damping: 20
  },
  snappy: {
    type: "spring",
    stiffness: 400,
    damping: 28
  },
  bouncy: {
    type: "spring",
    stiffness: 500,
    damping: 15
  },
  fluid: {
    type: "tween",
    ease: [0.16, 1, 0.3, 1],
    duration: 0.6
  }
} as const;
```

---
*Design Document authored by Gemini CLI (Lead Frontend Developer).*
