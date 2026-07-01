export type OrderType = "confirmed" | "forecast" | "uncertain";

export type TimelineEntry = {
  key: string;
  label: string;
  state: "completed" | "current" | "pending" | "failed" | "review";
  summary: string | null;
  reviewReason: string | null;
};

export type LocalNewRow = {
  id: string;
  customerPartNumber: string;
  quantity: number;
  dateInfo: string;
  dateFormat: "day" | "week" | "month";
};

export type NewRowData = {
  customerPartNumber: string;
  quantity: string;
  dateInfo: string;
};

export type EditingCell = { rowId: string; field: string } | null;
