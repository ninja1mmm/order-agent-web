export type DemandClassification = "confirmed" | "forecast";
export type DemandKind = "firm" | "forecast";
export type TimeGranularity = "day" | "week" | "month";

export type RollingForecastCell = {
  id: string;
  colKey: string;
  value: number;
  timeGranularity: TimeGranularity;
  classification: DemandClassification;
  hasManualRevision: boolean;
  dateStart: string;
  dateEnd: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RollingForecastRowGroup = {
  rowKey: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  cells: RollingForecastCell[];
};

export type RollingForecastResponse = {
  groups: RollingForecastRowGroup[];
  page: number;
  size: number;
  totalGroups: number;
};

export type CellRevision = {
  revision: number;
  value: number;
  previousValue: number | null;
  changeType: string;
  actorName: string | null;
  note: string | null;
  sourceFile: string | null;
  mailSubject: string | null;
  mailMessageId: string | null;
  createdAt: string;
};

export type RollingForecastCellWithHistory = RollingForecastCell & {
  revisions: CellRevision[];
};

export type RowDetailResponse = {
  rowKey: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  timeFrom: string;
  timeTo: string;
  cells: RollingForecastCellWithHistory[];
};

export type CellHistoryResponse = {
  revisions: CellRevision[];
};

export type RollingForecastQuery = {
  timeFrom: string;
  timeTo: string;
  page?: number;
  size?: number;
  customerId?: string;
  internalPartNumber?: string;
};

export type RowDetailQuery = {
  rowKey: string;
  timeFrom: string;
  timeTo: string;
};

export type ExportOrdersQuery = RollingForecastQuery & {
  kind: DemandKind;
};

export type RollingForecastCellUpdate = {
  rowKey: string;
  colKey: string;
  value: number;
  classification: DemandClassification;
  timeGranularity: TimeGranularity;
  reason: string;
};
