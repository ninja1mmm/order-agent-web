export type CustomerProfileCustomerSchema = {
  id: string;
  code: string;
  name: string;
  lastShippingDate: string | null;
  totalShippingWeeks: number;
};

export type CustomerProfileCustomersResponseSchema = {
  customers: CustomerProfileCustomerSchema[];
};

export type CustomerProfileWeekSchema = {
  weekKey: string;
  shippingCount: number;
  dateRange: string;
};

export type CustomerProfileWeeksResponseSchema = {
  weeks: CustomerProfileWeekSchema[];
  year: number | null;
  days: number | null;
};

export type WeekShippingRowSchema = {
  shippingDate: string;
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  quantity: number;
  deliveryNote: string | null;
  sourceFile: string | null;
};

export type ForecastVersionColumnSchema = {
  receivedAt: string;
  label: string;
  quantity: number;
};

export type ForecastTrendSchema = "stable" | "converging" | "diverging" | "volatile" | "no_forecast";

export type WeekForecastComparisonRowSchema = {
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  finalShippingQty: number;
  forecasts: ForecastVersionColumnSchema[];
  trend: ForecastTrendSchema;
};

export type CustomerProfileWeekDetailResponseSchema = {
  weekKey: string;
  dateRange: string;
  shippingRows: WeekShippingRowSchema[];
  forecastComparisons: WeekForecastComparisonRowSchema[];
};

export type MaterialForecastVersionSchema = {
  receivedAt: string;
  forecastQty: number;
  diff: number;
  sourceFile: string | null;
  changed: boolean;
};

export type MaterialChartPointSchema = {
  label: string;
  forecastQty: number;
};

export type MaterialDetailResponseSchema = {
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  weekKey: string;
  finalShippingQty: number;
  forecastVersions: MaterialForecastVersionSchema[];
  chartData: MaterialChartPointSchema[];
};

export type ShippingForecastPointSchema = {
  shippingDate: string;
  weekKey: string;
  shippingQty: number;
  lastForecastQty: number | null;
  lastForecastReceivedAt: string | null;
};

export type MaterialShippingForecastResponseSchema = {
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  days: number;
  dateFrom: string;
  dateTo: string;
  dataPoints: ShippingForecastPointSchema[];
};

export type CustomerProfileMaterialSchema = {
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  totalShippingQty: number;
  shippingWeekCount: number;
  lastShippingDate: string | null;
};

export type CustomerProfileMaterialsResponseSchema = {
  materials: CustomerProfileMaterialSchema[];
  year: number | null;
  days: number | null;
};

export type MaterialWeeklyProfilePointSchema = {
  weekKey: string;
  dateRange: string;
  shippingQty: number;
  shippingCount: number;
  lastForecastQty: number;
  hasForecast: boolean;
  lastForecastReceivedAt: string | null;
  lastForecastSourceFile: string | null;
  diff: number;
  diffRate: number | null;
};

export type MaterialWeeklyProfileResponseSchema = {
  material: CustomerProfileMaterialSchema;
  weeks: MaterialWeeklyProfilePointSchema[];
  year: number | null;
  days: number | null;
};

export type CustomerScoreMetricKeySchema =
  | "coverageScore"
  | "accuracyScore"
  | "biasHealthScore"
  | "convergenceScore"
  | "timelinessScore";

export type CustomerScoreBiasDirectionSchema = "over" | "under" | "balanced";

export type CustomerScoreMetricDetailSchema = {
  key: CustomerScoreMetricKeySchema;
  label: string;
  numeratorLabel: string;
  denominatorLabel: string;
  numerator: number | null;
  denominator: number | null;
  score: number | null;
  biasRate: number | null;
  biasDirection: CustomerScoreBiasDirectionSchema | null;
};

export type CustomerScorecardCurrentSchema = Record<CustomerScoreMetricKeySchema, number | null> & {
  details: CustomerScoreMetricDetailSchema[];
};

export type CustomerScorecardTimelinePointSchema = CustomerScorecardCurrentSchema & {
  receivedAt: string;
};

export type CustomerScorecardExplanationSchema = {
  key: CustomerScoreMetricKeySchema;
  label: string;
  description: string;
  formula: string;
};

export type CustomerScorecardResponseSchema = {
  current: CustomerScorecardCurrentSchema;
  timeline: CustomerScorecardTimelinePointSchema[];
  explanations: CustomerScorecardExplanationSchema[];
  days: number;
};
