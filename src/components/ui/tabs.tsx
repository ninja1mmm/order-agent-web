"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex gap-0 border-b border-[var(--line)] mb-3", className)}
      role="tablist"
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "px-3 py-2.5 text-xs font-black border-b-2 transition-colors cursor-pointer",
        active
          ? "text-[var(--forvia-blue)] border-[var(--forvia-blue)]"
          : "text-[var(--muted)] border-transparent hover:text-[var(--ink)]",
        className,
      )}
      {...props}
    />
  );
}

export { TabsList, TabsTrigger };
