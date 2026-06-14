import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary ring-primary/20",
        secondary:
          "bg-secondary text-secondary-foreground ring-secondary-foreground/20",
        // Status variants
        todo: "bg-muted text-muted-foreground ring-border",
        in_progress:
          "bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400",
        done: "bg-green-500/10 text-green-700 ring-green-500/20 dark:text-green-400",
        // Priority variants
        high: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400",
        medium:
          "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400",
        low: "bg-green-500/10 text-green-700 ring-green-500/20 dark:text-green-400",
        // Destructive
        destructive:
          "bg-destructive/10 text-destructive ring-destructive/20",
        // Role variants
        admin:
          "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-400",
        user:
          "bg-muted text-muted-foreground ring-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };