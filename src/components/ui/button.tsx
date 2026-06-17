import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "border-[var(--line)] bg-white text-[var(--ink)] hover:bg-gray-50",
        primary: "border-[var(--forvia-blue)] bg-[var(--forvia-blue)] text-white shadow-md hover:opacity-90",
        ghost: "border-transparent bg-transparent hover:bg-gray-100",
        destructive: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
      },
      size: {
        default: "h-[34px] px-3 text-xs",
        sm: "h-[28px] px-2 text-[11px] rounded-lg",
        icon: "h-[30px] w-[30px] min-w-[30px] p-0",
        "icon-sm": "h-[28px] w-[28px] min-w-[28px] p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} type="button" {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
