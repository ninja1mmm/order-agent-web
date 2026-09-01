export type ExcelPreview = {
  sheetNames: string[];
  activeSheet: string;
  rows: unknown[][];
  truncated: boolean;
};
