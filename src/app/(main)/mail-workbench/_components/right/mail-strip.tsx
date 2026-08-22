"use client";

import type { WorkspaceMail } from "@/types/models/inbox";
import type { Locale } from "../../../_components/shared";
import { MailStripCard } from "./mail-strip-card";

type Props = {
  mails: WorkspaceMail[];
  selectedMailId: string | null;
  onSelectMail: (mailId: string) => void;
  locale: Locale;
};

export function MailStrip({ mails, selectedMailId, onSelectMail, locale }: Props) {
  const sorted = [...mails].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="mail-strip" style={{ minHeight: 60, alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {locale === "en" ? "No mails" : "暂无邮件"}
        </span>
      </div>
    );
  }

  return (
    <div className="mail-strip">
      {sorted.map((mail) => (
        <MailStripCard
          key={mail.id}
          mail={mail}
          selected={mail.id === selectedMailId}
          onClick={() => onSelectMail(mail.id)}
        />
      ))}
    </div>
  );
}
