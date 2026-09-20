"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";
import { BACKEND_URL } from "@/api/client";
import type { WorkspaceAttachment, WorkspaceMail } from "@/services/inbox";
import { ExcelViewer, PdfViewer } from "../../../_components/shared-components";
import { type Locale, copy } from "../../../_components/shared";

type AttachmentPreviewProps = {
  locale: Locale;
  isBodyTextTask: boolean;
  selectedMail: WorkspaceMail | undefined;
  selectedAttachment: WorkspaceAttachment | undefined;
  targetSheetName?: string | null;
  parsedSheetNames: string[];
  addingSource: boolean;
  onAddSheetSource: (sheetName: string) => void;
};

export function AttachmentPreview({
  locale,
  isBodyTextTask,
  selectedMail,
  selectedAttachment,
  targetSheetName,
  parsedSheetNames,
  addingSource,
  onAddSheetSource,
}: AttachmentPreviewProps) {
  const t = copy[locale];

  if (isBodyTextTask && selectedMail) {
    if (selectedMail.bodyHtml) {
      return <MailHtmlBody mail={selectedMail} />;
    }
    return (
      <div className="mail-body-viewer">
        <div style={{ whiteSpace: "pre-line", padding: 16, fontSize: 13, lineHeight: 1.7, color: "var(--ink-soft)" }}>
          {normalizeMailBody(selectedMail.bodyText)}
          <MailImages mail={selectedMail} />
        </div>
      </div>
    );
  }

  if (selectedAttachment?.fileArtifactId) {
    return isExcelFile(selectedAttachment.fileName)
      ? <ExcelViewer key={`${selectedAttachment.fileArtifactId}:${targetSheetName ?? ""}`} fileArtifactId={selectedAttachment.fileArtifactId} locale={locale} initialSheet={targetSheetName} parsedSheetNames={parsedSheetNames} parsingSheet={addingSource} parseSheetLabel="新增解析" onParseSheet={onAddSheetSource} />
      : <PdfViewer fileArtifactId={selectedAttachment.fileArtifactId} locale={locale} />;
  }

  return <p className="item-meta">{t.noAttachment}</p>;
}

function MailHtmlBody({ mail }: { mail: WorkspaceMail }) {
  const sanitizedHtml = useMemo(() => {
    let html = mail.bodyHtml;
    // Replace cid: references with backend file URLs
    const cidMap = new Map<string, string>();
    for (const img of mail.inlineImages ?? []) {
      // img.imageId is the Content-ID (CID) without angle brackets
      cidMap.set(img.imageId, `${BACKEND_URL}/api/files/${img.fileArtifactId}/content`);
    }
    html = html.replace(/src=["']cid:([^"']+)["']/gi, (match, cid: string) => {
      const url = cidMap.get(cid);
      return url ? `src="${url}"` : match;
    });
    return DOMPurify.sanitize(html, {
      ADD_TAGS: ["style"],
      ADD_ATTR: ["target"],
      FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    });
  }, [mail.bodyHtml, mail.inlineImages]);

  return (
    <div className="mail-body-viewer" style={{ padding: 16 }}>
      <div
        className="mail-html-viewer"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}

function MailImages({ mail }: { mail: WorkspaceMail }) {
  const seenIds = new Set<string>();
  const allImages: { key: string; artifactId: string; alt: string }[] = [];

  for (const image of mail.inlineImages ?? []) {
    if (!seenIds.has(image.fileArtifactId)) {
      seenIds.add(image.fileArtifactId);
      allImages.push({ key: image.imageId, artifactId: image.fileArtifactId, alt: "inline" });
    }
  }

  for (const attachment of mail.attachments) {
    if (attachment.contentType?.startsWith("image/") && attachment.fileArtifactId && !seenIds.has(attachment.fileArtifactId)) {
      seenIds.add(attachment.fileArtifactId);
      allImages.push({ key: attachment.attachmentId, artifactId: attachment.fileArtifactId, alt: attachment.fileName });
    }
  }

  if (allImages.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {allImages.map((image) => (
        // eslint-disable-next-line @next/next/no-img-element -- Email artifact URLs and dimensions are only known at runtime; preserve the original image response without Next.js optimization.
        <img
          key={image.key}
          src={`${BACKEND_URL}/api/files/${image.artifactId}/content`}
          alt={image.alt}
          style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 4, alignSelf: "flex-start" }}
        />
      ))}
    </div>
  );
}

function normalizeMailBody(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/^[^\S\n]+$/gm, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function isExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xlsm") || lower.endsWith(".xls");
}
