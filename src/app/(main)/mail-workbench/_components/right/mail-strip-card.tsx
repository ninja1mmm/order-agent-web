"use client";

import type { WorkspaceMail } from "@/types/models/inbox";
import { formatShortDate } from "../../../_components/shared";

type Props = {
  mail: WorkspaceMail;
  selected: boolean;
  onClick: () => void;
};

export function MailStripCard({ mail, selected, onClick }: Props) {
  const statusDots: string[] = [];
  for (const att of mail.attachments) {
    for (const task of att.tasks ?? []) {
      statusDots.push(task.status);
    }
  }

  return (
    <div className={`mail-strip-card${selected ? " selected" : ""}`} onClick={onClick}>
      <div className="strip-subject">{mail.subject || "(no subject)"}</div>
      <div className="strip-meta">
        <span>{formatShortDate(mail.receivedAt)}</span>
        {mail.attachments.length > 0 && <span>{mail.attachments.length} att</span>}
      </div>
      {statusDots.length > 0 && (
        <div className="strip-dots">
          {statusDots.map((s, i) => (
            <span key={i} className={`dot ${s}`} />
          ))}
        </div>
      )}
    </div>
  );
}
