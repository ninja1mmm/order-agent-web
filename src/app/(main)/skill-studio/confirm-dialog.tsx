"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, body, confirmLabel = "确认", cancelLabel = "取消", variant = "primary", onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <DialogOverlay open={open} onClose={onCancel}>
      <DialogContent className="w-[min(440px,calc(100vw-40px))]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">{body}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={onCancel}>{cancelLabel}</Button>
            <Button ref={confirmRef} variant={variant === "destructive" ? "destructive" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </DialogBody>
      </DialogContent>
    </DialogOverlay>
  );
}

type ConfirmState = { open: false } | { open: true; title: string; body: string; variant?: "destructive" | "primary"; confirmLabel?: string };

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: { title: string; body: string; variant?: "destructive" | "primary"; confirmLabel?: string }) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, ...opts });
    });
  }, []);

  const handle = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState({ open: false });
  }, []);

  const dialogProps = state.open ? {
    open: true as const,
    title: state.title,
    body: state.body,
    variant: state.variant,
    confirmLabel: state.confirmLabel,
    onConfirm: () => handle(true),
    onCancel: () => handle(false),
  } : {
    open: false as const,
    title: "",
    body: "",
    onConfirm: () => {},
    onCancel: () => {},
  };

  return { confirm, dialogProps };
}
