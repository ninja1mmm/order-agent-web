"use client";

import * as React from "react";
import { DayPicker, DayFlag, SelectionState, UI, type DayPickerProps } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      locale={zhCN}
      showOutsideDays={showOutsideDays}
      className={cn("relative w-[252px] text-xs", className)}
      classNames={{
        [UI.Month]: "space-y-2",
        [UI.MonthCaption]: "flex h-8 items-center pr-20",
        [UI.CaptionLabel]: "whitespace-nowrap text-sm font-bold text-[var(--ink)]",
        [UI.Nav]: "absolute right-0 top-0 flex gap-1",
        [UI.PreviousMonthButton]: "flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--surface-muted)]",
        [UI.NextMonthButton]: "flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--surface-muted)]",
        [UI.Chevron]: "h-4 w-4 fill-[var(--muted-strong)]",
        [UI.MonthGrid]: "w-full border-collapse",
        [UI.Weekday]: "h-9 w-9 text-center font-medium text-[var(--muted)]",
        [UI.Day]: "h-9 w-9 p-0 text-center",
        [UI.DayButton]: "h-9 w-9 rounded-full font-medium hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forvia-blue)]",
        [DayFlag.outside]: "text-[var(--muted-light)]",
        [DayFlag.today]: "font-bold text-[var(--forvia-blue)]",
        [SelectionState.selected]: "[&>button]:rounded-full [&>button]:bg-[var(--forvia-blue)] [&>button]:text-white [&>button]:hover:bg-[var(--forvia-blue-active)]",
        [DayFlag.disabled]: "pointer-events-none opacity-40",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
