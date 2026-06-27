"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type FilterSelectOption = string | {
  value: string;
  label: string;
};

interface FilterSelectProps {
  label: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

function optionValue(option: FilterSelectOption) {
  return typeof option === "string" ? option : option.value;
}

function optionLabel(option: FilterSelectOption) {
  return typeof option === "string" ? option : option.label;
}

function FilterSelect({ label, value, options, onChange, className }: FilterSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selectedLabel = optionLabel(options.find((option) => optionValue(option) === value) ?? value);

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
        <span className="truncate">{label}：{selectedLabel}</span>
        <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
      </button>
      {open && (
        <div className="absolute z-20 top-[44px] left-0 right-0 p-1.5 border border-[var(--line)] rounded-2xl bg-white shadow-lg">
          {options.map((option) => {
            const currentValue = optionValue(option);
            const currentLabel = optionLabel(option);
            return (
              <button
                type="button"
                key={currentValue}
                className={cn(
                  "block w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                  currentValue === value
                    ? "bg-[var(--forvia-blue-soft)] text-[var(--forvia-blue)]"
                    : "text-slate-500 hover:bg-[var(--forvia-blue-soft)] hover:text-[var(--forvia-blue)]",
                )}
                onClick={() => { onChange(currentValue); setOpen(false); }}
              >
                {currentLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SearchableFilterSelectProps {
  label: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

function SearchableFilterSelect({ label, value, options, onChange, className, placeholder }: SearchableFilterSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selectedLabel = optionLabel(options.find((option) => optionValue(option) === value) ?? value);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = options.filter((option) => {
    if (!search) return true;
    const lbl = optionLabel(option).toLowerCase();
    const val = optionValue(option).toLowerCase();
    const term = search.toLowerCase();
    return lbl.includes(term) || val.includes(term);
  });

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full min-h-[38px] border border-[var(--line)] rounded-xl bg-white px-2.5 py-2 text-xs font-black text-[var(--ink)] cursor-pointer hover:border-[var(--forvia-blue-border)]"
      >
        <span className="truncate">{label}：{selectedLabel}</span>
        <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
      </button>
      {open && (
        <div className="absolute z-20 top-[44px] left-0 right-0 p-1.5 border border-[var(--line)] rounded-2xl bg-white shadow-lg max-h-[280px] flex flex-col">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder ?? "搜索..."}
            className="w-full px-2.5 py-1.5 mb-1 border border-[var(--line)] rounded-lg text-xs outline-none focus:border-[var(--forvia-blue-border)]"
          />
          <div className="overflow-y-auto flex-1">
            {filtered.map((option) => {
              const currentValue = optionValue(option);
              const currentLabel = optionLabel(option);
              return (
                <button
                  type="button"
                  key={currentValue}
                  className={cn(
                    "block w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                    currentValue === value
                      ? "bg-[var(--forvia-blue-soft)] text-[var(--forvia-blue)]"
                      : "text-slate-500 hover:bg-[var(--forvia-blue-soft)] hover:text-[var(--forvia-blue)]",
                  )}
                  onClick={() => { onChange(currentValue); setOpen(false); setSearch(""); }}
                >
                  {currentLabel}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-2.5 py-2 text-xs text-[var(--muted)]">无匹配项</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { FilterSelect, SearchableFilterSelect };
