export type DemandClassificationSchema = "confirmed" | "forecast";
export type TimeGranularitySchema = "day" | "week" | "month";

export type RollingForecastCellSchema = {
  id: string;
  colKey: string;
  value: number;
  timeGranularity: TimeGranularitySchema;
  classification: DemandClassificationSchema;
  hasManualRevision: boolean;
  dateStart: string;
  dateEnd: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RollingForecastRowGroupSchema = {
  rowKey: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  cells: RollingForecastCellSchema[];
};

export type RollingForecastResponseSchema = {
  groups: RollingForecastRowGroupSchema[];
  page: number;
  size: number;
  totalGroups: number;
};

export type CellRevisionSchema = {
  revision: number;
  value: number;
  previousValue: number | null;
  changeType: string;
  actorName: string | null;
  note: string | null;
  sourceFile: string | null;
  mailSubject: string | null;
  mailMessageId: string | null;
  mergeStrategy: string | null;
  inputQuantity: number | null;
  createdAt: string;
};

export type RollingForecastCellWithHistorySchema = RollingForecastCellSchema & {
  revisions: CellRevisionSchema[];
};

export type RowDetailResponseSchema = {
  rowKey: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  timeFrom: string;
  timeTo: string;
  cells: RollingForecastCellWithHistorySchema[];
};

export type CellHistoryResponseSchema = {
  revisions: CellRevisionSchema[];
};

export type RollingForecastQuerySchema = {
  timeFrom: string;
  timeTo: string;
  page?: number;
  size?: number;
  customerId?: string;
  internalPartNumber?: string;
};

export type RowDetailQuerySchema = {
  rowKey: string;
  timeFrom: string;
  timeTo: string;
};

export type RollingForecastCellUpdateSchema = {
  rowKey: string;
  colKey: string;
  value: number;
  classification: DemandClassificationSchema;
  timeGranularity: TimeGranularitySchema;
  reason: string;
};
