"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}

function FilterSelect({ label, value, options, onChange, className }: FilterSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full min-h-[38px] border border-[var(--line)] rounded-xl bg-white px-2.5 py-2 text-xs font-black text-[var(--ink)] cursor-pointer hover:border-[var(--forvia-blue-border)]"
      >
        <span className="truncate">{label}：{value}</span>
        <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
      </button>
      {open && (
        <div className="absolute z-20 top-[44px] left-0 right-0 p-1.5 border border-[var(--line)] rounded-2xl bg-white shadow-lg">
          {options.map((option) => (
            <button
              type="button"
              key={option}
              className={cn(
                "block w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                option === value
                  ? "bg-[var(--forvia-blue-soft)] text-[var(--forvia-blue)]"
                  : "text-slate-500 hover:bg-[var(--forvia-blue-soft)] hover:text-[var(--forvia-blue)]",
              )}
              onClick={() => { onChange(option); setOpen(false); }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { FilterSelect };
