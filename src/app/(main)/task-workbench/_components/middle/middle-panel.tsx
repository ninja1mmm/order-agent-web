"use client";

import { BACKEND_URL } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { WorkspaceMail } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import {
  type Locale,
  copy,
  customerLabelFromId,
  formatDateTime,
} from "../../../_components/shared";

type MiddlePanelProps = {
  locale: Locale;
  mail: WorkspaceMail | undefined;
  customers: CustomerConfig[];
};

export function MiddlePanel({ locale, mail, customers }: MiddlePanelProps) {
  const t = copy[locale];

  return (
    <section className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">{t.mailBody}</h2>
      </div>
      <div className="panel-body stack">
        {mail ? (
          <>
            <Card>
              <div className="row">
                <CardTitle>{mail.subject}</CardTitle>
                {(mail.customerName || mail.customerId) && (
                  <Badge variant="blue">{customerLabelFromId(customers, mail.customerId, mail.customerName)}</Badge>
                )}
              </div>
              <CardDescription>
                From: {mail.fromEmail} · {t.receivedAt}: {formatDateTime(mail.receivedAt, locale)}
              </CardDescription>
            </Card>
            <div className="mail-body" style={{ whiteSpace: "pre-line" }}>
              {normalizeMailBody(mail.bodyText)}
              <MailImages mail={mail} />
            </div>
          </>
        ) : (
          <p className="item-meta">{t.noMail}</p>
        )}
      </div>
    </section>
  );
}

function normalizeMailBody(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/^[^\S\n]+$/gm, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function MailImages({ mail }: { mail: WorkspaceMail }) {
  const seenIds = new Set<string>();
  const allImages: { key: string; artifactId: string; alt: string }[] = [];

  for (const img of mail.inlineImages ?? []) {
    if (!seenIds.has(img.fileArtifactId)) {
      seenIds.add(img.fileArtifactId);
      allImages.push({ key: img.imageId, artifactId: img.fileArtifactId, alt: "inline" });
    }
  }

  for (const att of mail.attachments) {
    if (att.contentType?.startsWith("image/") && att.fileArtifactId && !seenIds.has(att.fileArtifactId)) {
      seenIds.add(att.fileArtifactId);
      allImages.push({ key: att.attachmentId, artifactId: att.fileArtifactId, alt: att.fileName });
    }
  }

  if (allImages.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {allImages.map((img) => (
        <img
          key={img.key}
          src={`${BACKEND_URL}/api/files/${img.artifactId}/content`}
          alt={img.alt}
          style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 4, alignSelf: "flex-start" }}
        />
      ))}
    </div>
  );
}
