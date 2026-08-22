"use client";

type Props = {
  customerName: string;
  latestSubject: string;
  latestDate: string;
  attachmentCount: number;
  unresolvedCount: number;
  selected: boolean;
  onClick: () => void;
};

function relativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function CustomerCard({
  customerName,
  latestSubject,
  latestDate,
  attachmentCount,
  unresolvedCount,
  selected,
  onClick,
}: Props) {
  return (
    <div className={`customer-card${selected ? " selected" : ""}`} onClick={onClick}>
      <div className="customer-name">{customerName}</div>
      {latestSubject && (
        <div className="customer-latest" title={latestSubject}>
          {latestSubject}
        </div>
      )}
      <div className="customer-badges">
        {latestDate && (
          <span className="badge slate" style={{ fontSize: 10 }}>
            {relativeTime(latestDate)}
          </span>
        )}
        {attachmentCount > 0 && (
          <span className="badge blue" style={{ fontSize: 10 }}>
            {attachmentCount} att
          </span>
        )}
        {unresolvedCount > 0 && (
          <span className="badge amber" style={{ fontSize: 10 }}>
            {unresolvedCount} pending
          </span>
        )}
      </div>
    </div>
  );
}
