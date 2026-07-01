"use client";

import { ChevronDown } from "lucide-react";
import type { WorkspaceMail } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import { customerLabelFromId } from "../../_components/shared";
import { compactText, formatRelativeTime } from "./sc-agent-utils";

type AgentMailCardProps = {
  mails: WorkspaceMail[];
  customers: CustomerConfig[];
  expandedMails: Set<string>;
  onToggleMail: (id: string) => void;
};

export function AgentMailCard({
  mails,
  customers,
  expandedMails,
  onToggleMail,
}: AgentMailCardProps) {
  if (mails.length === 0) {
    return <p className="message-empty">暂无邮件</p>;
  }

  return (
    <div className="message-accordion">
      {mails.map((mail) => (
        <MailAccordionItem
          key={mail.id}
          mail={mail}
          customers={customers}
          isOpen={expandedMails.has(mail.id)}
          onToggle={() => onToggleMail(mail.id)}
        />
      ))}
    </div>
  );
}

function MailAccordionItem({
  mail,
  customers,
  isOpen,
  onToggle,
}: {
  mail: WorkspaceMail;
  customers: CustomerConfig[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const customer = customerLabelFromId(
    customers,
    mail.customerId,
    mail.customerName || mail.fromEmail,
  );

  return (
    <div className={`accordion-item${isOpen ? " open" : ""}`}>
      <button
        type="button"
        className="accordion-trigger"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="accordion-trigger-content">
          <strong>{mail.subject || "未命名邮件"}</strong>
          <span>
            {customer} ·{" "}
            {formatRelativeTime(mail.receivedAt || mail.createdAt)}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`accordion-chevron${isOpen ? " rotated" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="accordion-body">
          <div className="accordion-detail-row">
            <span>发件人</span>
            <strong>{mail.fromEmail}</strong>
          </div>
          <div className="accordion-detail-row">
            <span>客户</span>
            <strong>{customer}</strong>
          </div>
          <div className="accordion-detail-row">
            <span>附件</span>
            <strong>
              {mail.attachments.length
                ? mail.attachments
                    .map((attachment) => `${attachment.fileName} (${attachment.status || "待处理"})`)
                    .join("、")
                : "无附件"}
            </strong>
          </div>
          <p className="accordion-body-text">
            {compactText(mail.bodyText || "邮件正文暂无。")}
          </p>
        </div>
      )}
    </div>
  );
}
