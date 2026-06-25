"use client";

import React, { useMemo, useState } from "react";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

import { BACKEND_URL } from "../../../api/client";
import type { WorkspaceMail } from "../../../services/inbox";
import type { CustomerConfig } from "../../../services/settings";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/select";
import { DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { type Locale, beijingDateKey, copy, customerLabel, customerLabelFromId, formatShortDate } from "./shared";

function buildHeatmapColumns(days = 14) {
  const [year, month, day] = beijingDateKey(new Date()).split("-").map(Number);
  const today = new Date(Date.UTC(year, month - 1, day));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - 1 - index));
    return beijingDateKey(date);
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
  customers,
  locale,
}: {
  mails: WorkspaceMail[];
  customers: CustomerConfig[];
  locale: Locale;
}) {
  const t = copy[locale];
  const [view, setView] = useState<"activity" | "today">("activity");
  const columns = useMemo(() => buildHeatmapColumns(14), []);
  const configuredCustomerNames = customers.map(customerLabel);
  const fallbackCustomers = Array.from(new Set(mails.map((mail) => mail.customerName || mail.customerId).filter(Boolean) as string[]));
  const displayCustomers = configuredCustomerNames.length ? configuredCustomerNames : fallbackCustomers;

  const countsByCustomerDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const mail of mails) {
      const customer = customerLabelFromId(customers, mail.customerId, mail.customerName);
      const dayKey = beijingDateKey(mail.receivedAt);
      if (!customer || !dayKey) continue;
      const key = `${customer}|${dayKey}`;
      map.set(key, (map.get(key) ?? 0) + Math.max(mail.attachments.length, 1));
    }
    return map;
  }, [customers, mails]);

  const todayCards = useMemo(() => {
    const today = beijingDateKey(new Date());
    return displayCustomers.map((customer) => {
      const todayMails = mails.filter((mail) => {
        const name = customerLabelFromId(customers, mail.customerId, mail.customerName);
        const dayKey = beijingDateKey(mail.receivedAt);
        if (name !== customer || !dayKey) return false;
        return dayKey === today;
      });
      return { customer, count: todayMails.length };
    });
  }, [customers, displayCustomers, mails]);

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
              <span key={date}>{formatShortDate(date)}</span>
            ))}
            {displayCustomers.length === 0 ? (
              <span style={{ gridColumn: "1 / -1" }} className="item-meta">
                暂无客户邮件数据
              </span>
            ) : (
              displayCustomers.map((customer) => (
                <React.Fragment key={customer}>
                  <span>{customer}</span>
                  {columns.map((date) => {
                    const key = `${customer}|${date}`;
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

function PreviewState({ label, error }: { label: string; error?: string }) {
  return (
    <div className="preview-state" role="status" aria-live="polite">
      {error ? null : <LoaderCircle className="preview-spinner" aria-hidden="true" />}
      <p className={error ? "preview-error" : "item-meta"}>{error ?? label}</p>
    </div>
  );
}

function blobWithPreviewType(blob: Blob, fileName: string): Blob {
  if (blob.type && blob.type !== "application/octet-stream") return blob;
  if (fileName.toLowerCase().endsWith(".pdf")) {
    return new Blob([blob], { type: "application/pdf" });
  }
  return blob;
}

export function ExcelViewer({ fileArtifactId, locale }: { fileArtifactId: string; locale: Locale }) {
  const t = copy[locale];
  const [requestedSheet, setRequestedSheet] = React.useState("");
  const requestKey = `${fileArtifactId}:${requestedSheet}`;
  const [preview, setPreview] = React.useState<{
    key: string;
    sheetNames: string[];
    activeSheet: string;
    rows: (string | number | null)[][];
    truncated: boolean;
    error: string | null;
  } | null>(null);

  const fetchSheet = React.useCallback(
    (sheet?: string) => {
      const query = sheet ? `?sheet=${encodeURIComponent(sheet)}` : "";
      const key = `${fileArtifactId}:${sheet ?? ""}`;
      fetch(`${BACKEND_URL}/api/files/${fileArtifactId}/excel-preview${query}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setPreview({
            key,
            sheetNames: data.sheetNames ?? [],
            activeSheet: data.activeSheet ?? "",
            rows: data.rows ?? [],
            truncated: data.truncated ?? false,
            error: null,
          });
        })
        .catch((err) => {
          setPreview({
            key,
            sheetNames: [],
            activeSheet: "",
            rows: [],
            truncated: false,
            error: err instanceof Error ? err.message : t.previewLoadFailed,
          });
        });
    },
    [fileArtifactId, t.previewLoadFailed],
  );

  React.useEffect(() => {
    fetchSheet(requestedSheet || undefined);
  }, [fetchSheet, requestedSheet]);

  const loading = preview?.key !== requestKey;
  const error = preview?.key === requestKey ? preview.error : null;

  if (loading) return <div className="pdf-viewer"><PreviewState label={t.loadingPreview} /></div>;
  if (error) return <div className="pdf-viewer"><PreviewState label={t.previewLoadFailed} error={`${t.previewLoadFailed}: ${error}`} /></div>;

  return (
    <div className="excel-viewer">
      <div className="excel-sheet-tabs">
        {(preview?.sheetNames ?? []).map((name) => (
          <button
            type="button"
            key={name}
            className={`excel-tab ${name === preview?.activeSheet ? "active" : ""}`}
            onClick={() => setRequestedSheet(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="excel-table-wrap">
        <table className="excel-table">
          <tbody>
            {(preview?.rows ?? []).map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, colIdx) => {
                  const Tag = rowIdx === 0 ? "th" : "td";
                  return <Tag key={colIdx}>{cell != null ? String(cell) : ""}</Tag>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {preview?.truncated && <p className="item-meta" style={{ textAlign: "center", padding: 8 }}>... 数据已截断 (最多 200 行)</p>}
      </div>
    </div>
  );
}

export function PdfViewer({ fileArtifactId, fileName, locale }: { fileArtifactId: string; fileName: string; locale: Locale }) {
  const t = copy[locale];
  const [scale, setScale] = useState(100);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = React.useState<{ key: string; objectUrl: string | null; error: string | null } | null>(null);
  const objectUrl = preview?.key === fileArtifactId ? preview.objectUrl : null;
  const error = preview?.key === fileArtifactId ? preview.error : null;
  const loading = !objectUrl && !error;
  const src = objectUrl ? `${objectUrl}#toolbar=0&navpanes=0&page=${page}&zoom=${scale}` : "";

  React.useEffect(() => {
    const controller = new AbortController();
    let previewUrl: string | null = null;

    fetch(`${BACKEND_URL}/api/files/${fileArtifactId}/download`, {
      signal: controller.signal,
      headers: { Accept: "application/pdf,*/*" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        previewUrl = URL.createObjectURL(blobWithPreviewType(blob, fileName));
        setPreview({ key: fileArtifactId, objectUrl: previewUrl, error: null });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPreview({
          key: fileArtifactId,
          objectUrl: null,
          error: err instanceof Error ? err.message : t.previewLoadFailed,
        });
      });

    return () => {
      controller.abort();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [fileArtifactId, fileName, t.previewLoadFailed]);

  return (
    <div className="pdf-viewer">
      {objectUrl && !error ? (
        <>
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
        </>
      ) : null}
      {loading ? <PreviewState label={t.loadingPreview} /> : null}
      {error ? <PreviewState label={t.previewLoadFailed} error={`${t.previewLoadFailed}: ${error}`} /> : null}
    </div>
  );
}

export function NewMailModal({
  open,
  locale,
  customers,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  locale: Locale;
  customers: CustomerConfig[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const t = copy[locale];
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("");
  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: customerLabel(customer),
  }));
  const effectiveCustomerId = customers.some((customer) => customer.id === selectedCustomerId)
    ? selectedCustomerId
    : customers[0]?.id ?? "";
  const selectedCustomer = customers.find((customer) => customer.id === effectiveCustomerId);

  return (
    <DialogOverlay open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.newMail}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>{t.close}</Button>
        </DialogHeader>
        <DialogBody>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <FilterSelect
              label={t.filterCustomer}
              value={effectiveCustomerId}
              options={customerOptions}
              onChange={setSelectedCustomerId}
            />
            <input name="customerId" type="hidden" value={selectedCustomer?.id ?? ""} />
            <input name="customerName" type="hidden" value={selectedCustomer ? customerLabel(selectedCustomer) : ""} />
            <Input name="subject" placeholder="subject" required />
            <Textarea name="bodyText" placeholder="body text" rows={4} required />
            <input name="attachments" type="file" multiple required />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="default" size="sm" onClick={onClose}>{t.close}</Button>
              <Button variant="primary" size="sm" type="submit" disabled={submitting || !selectedCustomer}>{submitting ? "..." : t.submit}</Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </DialogOverlay>
  );
}
