import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-600",
        blue: "bg-[var(--forvia-blue-soft)] text-[var(--forvia-blue)] border border-[var(--forvia-blue-border)]",
        red: "bg-red-50 text-rose-600 border border-rose-200",
        amber: "bg-amber-50 text-amber-700 border border-amber-200",
        slate: "bg-slate-100 text-slate-500 border border-slate-200",
        green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  tooltip?: React.ReactNode;
}

function Badge({ className, variant, tooltip, title, tabIndex, ...props }: BadgeProps) {
  const tooltipContent = tooltip ?? title;
  const badge = <span className={cn(badgeVariants({ variant }), tooltipContent && "cursor-help", className)} tabIndex={tabIndex ?? (tooltipContent ? 0 : undefined)} {...props} />;
  if (!tooltipContent) return badge;
  return <Tooltip><TooltipTrigger asChild>{badge}</TooltipTrigger><TooltipContent>{tooltipContent}</TooltipContent></Tooltip>;
}

export { Badge, badgeVariants };
