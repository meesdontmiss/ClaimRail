import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/15 text-primary shadow-[0_0_10px_rgba(29,185,84,0.15)]",
        secondary: "border-white/10 bg-white/[0.06] text-[#b3b3b3]",
        destructive: "border-destructive/30 bg-destructive/15 text-destructive",
        outline: "border-white/10 text-[#b3b3b3]",
        success: "border-primary/30 bg-primary/15 text-primary shadow-[0_0_10px_rgba(29,185,84,0.15)]",
        warning: "border-warning/30 bg-warning/15 text-warning shadow-[0_0_10px_rgba(245,158,11,0.15)]",
        danger: "border-danger/30 bg-danger/15 text-danger shadow-[0_0_10px_rgba(227,72,80,0.15)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
