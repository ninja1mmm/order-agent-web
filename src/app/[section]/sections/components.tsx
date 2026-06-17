"use client";

import React, { useMemo, useState } from "react";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";

import { BACKEND_URL } from "../../../api/client";
import type { WorkspaceMail } from "../../../services/inbox";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { type Locale, copy, formatShortDate } from "./shared";

function buildHeatmapColumns(days = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return date;
  });
}

function heatLevel(count: number) {
  if (count <= 0) return "heat-0";
  if (count === 1) return "heat-1";
  if (count === 2) return "heat-2";
  if (count === 3) return "heat-3";
  return "heat-4";
}

export function CustomerHeatmap({
  mails,
  customerNames,
  locale,
}: {
  mails: WorkspaceMail[];
  customerNames: string[];
  locale: Locale;
}) {
  const t = copy[locale];
  const [view, setView] = useState<"activity" | "today">("activity");
  const columns = useMemo(() => buildHeatmapColumns(14), []);
  const customers = customerNames.length
    ? customerNames
    : Array.from(new Set(mails.map((mail) => mail.customer_name || mail.customer_id).filter(Boolean) as string[]));

  const countsByCustomerDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const mail of mails) {
      const customer = mail.customer_name || mail.customer_id;
      if (!customer) continue;
      const day = new Date(mail.received_at);
      day.setHours(0, 0, 0, 0);
      const key = `${customer}|${day.toISOString()}`;
      map.set(key, (map.get(key) ?? 0) + Math.max(mail.attachments.length, 1));
    }
    return map;
  }, [mails]);

  const todayCards = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return customers.map((customer) => {
      const todayMails = mails.filter((mail) => {
        const name = mail.customer_name || mail.customer_id;
        if (name !== customer) return false;
        const received = new Date(mail.received_at);
        received.setHours(0, 0, 0, 0);
        return received.getTime() === today.getTime();
      });
      return { customer, count: todayMails.length };
    });
  }, [customers, mails]);

  return (
    <>
      <div className="panel-head">
        <h2 className="panel-title">{t.customerRhythm}</h2>
        <div className="mode-strip">
          <Button variant={view === "activity" ? "primary" : "default"} size="sm" onClick={() => setView("activity")}>
            {t.days30}
          </Button>
          <Button variant={view === "today" ? "primary" : "default"} size="sm" onClick={() => setView("today")}>
            {t.today}
          </Button>
        </div>
      </div>
      <div className="panel-body stack">
        {view === "activity" ? (
          <div className="heatmap service-heatmap">
            <strong>{t.customerLabel}</strong>
            {columns.map((date) => (
              <span key={date.toISOString()}>{formatShortDate(date)}</span>
            ))}
            {customers.length === 0 ? (
              <span style={{ gridColumn: "1 / -1" }} className="item-meta">
                暂无客户邮件数据
              </span>
            ) : (
              customers.map((customer) => (
                <React.Fragment key={customer}>
                  <span>{customer}</span>
                  {columns.map((date) => {
                    const key = `${customer}|${date.toISOString()}`;
                    const count = countsByCustomerDay.get(key) ?? 0;
                    return <span key={key} className={`heat-cell ${heatLevel(count)}`} aria-label={`${formatShortDate(date)} ${customer}`} />;
                  })}
                </React.Fragment>
              ))
            )}
          </div>
        ) : (
          <div className="today-mail-grid">
            {todayCards.map((item) => (
              <div key={item.customer} className={`today-mail-row ${item.count === 0 ? "missed" : ""}`}>
                <span>{item.customer}</span>
                <strong>{item.count}</strong>
                <small>{item.count === 0 ? "今日暂无邮件" : `今日收到 ${item.count} 封邮件`}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function PdfViewer({ attachmentId, locale }: { attachmentId: string; locale: Locale }) {
  const t = copy[locale];
  const [scale, setScale] = useState(100);
  const [page, setPage] = useState(1);
  const src = `${BACKEND_URL}/api/files/${attachmentId}#toolbar=0&navpanes=0&page=${page}&zoom=${scale}`;

  return (
    <div className="pdf-viewer">
      <div className="glass-toolbar">
        <Button variant="ghost" size="icon-sm" aria-label={t.zoomOut} onClick={() => setScale((value) => Math.max(50, value - 10))}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="page-indicator">
          {t.page} {page} · {scale}%
        </span>
        <Button variant="ghost" size="icon-sm" aria-label={t.zoomIn} onClick={() => setScale((value) => Math.min(200, value + 10))}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setPage((value) => Math.max(1, value - 1))}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setPage((value) => value + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <iframe title="pdf-preview" src={src} className="pdf-iframe" />
    </div>
  );
}

export function NewMailModal({
  open,
  locale,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  locale: Locale;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const t = copy[locale];
  return (
    <DialogOverlay open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.newMail}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>{t.close}</Button>
        </DialogHeader>
        <DialogBody>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <Input name="customerId" placeholder="customerId (slp-mexico)" required />
            <Input name="customerName" placeholder="customerName" />
            <Input name="subject" placeholder="subject" required />
            <Textarea name="bodyText" placeholder="body text" rows={4} required />
            <input name="attachments" type="file" multiple required />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="default" size="sm" onClick={onClose}>{t.close}</Button>
              <Button variant="primary" size="sm" type="submit" disabled={submitting}>{submitting ? "..." : t.submit}</Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </DialogOverlay>
  );
}
