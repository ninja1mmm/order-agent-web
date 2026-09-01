export type ExcelPreviewResponseSchema = {
  sheetNames: string[];
  activeSheet: string;
  rows: unknown[][];
  truncated: boolean;
};
