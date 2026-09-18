"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
};

function dateFromKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value ? date : undefined;
}

function DatePicker({ value, onChange, className, disabled, placeholder = "年/月/日", "aria-label": ariaLabel }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = dateFromKey(value);
  const today = new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${ariaLabel}：${selected ? format(selected, "yyyy/MM/dd") : "未选择"}`}
          aria-expanded={open}
          disabled={disabled}
          className={cn("flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-left text-sm font-semibold text-[var(--ink)] hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forvia-blue-border)] disabled:cursor-not-allowed disabled:opacity-50", className)}
        >
          <span className={cn("min-w-0 truncate tabular-nums", !selected && "text-[var(--muted)]")}>{selected ? format(selected, "yyyy/MM/dd") : placeholder}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? today}
          captionLayout="label"
          startMonth={new Date(1900, 0)}
          endMonth={new Date(2100, 11)}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
        />
        <div className="mt-2 flex justify-between border-t border-[var(--line)] pt-2 text-xs">
          <button type="button" className="rounded px-2 py-1 text-[var(--forvia-blue)] hover:bg-[var(--forvia-blue-soft)]" onClick={() => { onChange(""); setOpen(false); }}>清除</button>
          <button type="button" className="rounded px-2 py-1 text-[var(--forvia-blue)] hover:bg-[var(--forvia-blue-soft)]" onClick={() => { onChange(format(today, "yyyy-MM-dd")); setOpen(false); }}>今天</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
