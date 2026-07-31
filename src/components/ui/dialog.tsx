"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function DialogOverlay({ className, open, onClose, children }: { className?: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className={cn("fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-8", className)} onClick={onClose}>
      {children}
    </div>
  );
}

function DialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-[min(980px,calc(100vw-40px))] max-h-[calc(100vh-60px)] overflow-hidden bg-white rounded-3xl border border-[var(--line)] shadow-2xl flex flex-col",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex shrink-0 items-center justify-between gap-3 px-5 py-4 border-b border-[var(--line)]", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-sm font-black text-[var(--ink)]", className)} {...props} />;
}

function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-0 flex-1 overflow-auto px-5 py-4", className)} {...props} />;
}

export { DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogBody };
