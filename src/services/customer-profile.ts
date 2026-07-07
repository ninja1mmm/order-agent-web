import { apiRequest } from "../api/client";

export type CustomerProfileCustomer = {
  id: string;
  code: string;
  name: string;
  lastShippingDate: string | null;
  totalShippingWeeks: number;
};

export type CustomerProfileCustomersResponse = {
  customers: CustomerProfileCustomer[];
};

export type CustomerProfileWeek = {
  weekKey: string;
  shippingCount: number;
  dateRange: string;
};

export type CustomerProfileWeeksResponse = {
  weeks: CustomerProfileWeek[];
  year: number | null;
  days: number | null;
};

export type WeekShippingRow = {
  shippingDate: string;
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  quantity: number;
  deliveryNote: string | null;
  sourceFile: string | null;
};

export type ForecastVersionColumn = {
  receivedAt: string;
  label: string;
  quantity: number;
};

export type ForecastTrend = "stable" | "converging" | "diverging" | "volatile" | "no_forecast";

export type WeekForecastComparisonRow = {
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  finalShippingQty: number;
  forecasts: ForecastVersionColumn[];
  trend: ForecastTrend;
};

export type CustomerProfileWeekDetailResponse = {
  weekKey: string;
  dateRange: string;
  shippingRows: WeekShippingRow[];
  forecastComparisons: WeekForecastComparisonRow[];
};

export type MaterialForecastVersion = {
  receivedAt: string;
  forecastQty: number;
  diff: number;
  sourceFile: string | null;
  changed: boolean;
};

export type MaterialChartPoint = {
  label: string;
  forecastQty: number;
};

export type MaterialDetailResponse = {
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  weekKey: string;
  finalShippingQty: number;
  forecastVersions: MaterialForecastVersion[];
  chartData: MaterialChartPoint[];
};

export type ShippingForecastPoint = {
  shippingDate: string;
  weekKey: string;
  shippingQty: number;
  lastForecastQty: number | null;
  lastForecastReceivedAt: string | null;
};

export type MaterialShippingForecastResponse = {
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  days: number;
  dateFrom: string;
  dateTo: string;
  dataPoints: ShippingForecastPoint[];
};

export type CustomerProfileMaterial = {
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  totalShippingQty: number;
  shippingWeekCount: number;
  lastShippingDate: string | null;
};

export type CustomerProfileMaterialsResponse = {
  materials: CustomerProfileMaterial[];
  year: number | null;
  days: number | null;
};

export type MaterialWeeklyProfilePoint = {
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

export type MaterialWeeklyProfileResponse = {
  material: CustomerProfileMaterial;
  weeks: MaterialWeeklyProfilePoint[];
  year: number | null;
  days: number | null;
};

export type CustomerScoreMetricKey =
  | "coverageScore"
  | "accuracyScore"
  | "biasHealthScore"
  | "convergenceScore"
  | "timelinessScore";

export type CustomerScorecardCurrent = Record<CustomerScoreMetricKey, number | null>;

export type CustomerScorecardTimelinePoint = CustomerScorecardCurrent & {
  receivedAt: string;
};

export type CustomerScorecardExplanation = {
  key: CustomerScoreMetricKey;
  label: string;
  description: string;
  formula: string;
};

export type CustomerScorecardResponse = {
  current: CustomerScorecardCurrent;
  timeline: CustomerScorecardTimelinePoint[];
  explanations: CustomerScorecardExplanation[];
  days: number;
};

export type CustomerProfileViewMode = "year" | "30" | "60" | "90";

export function getCustomerProfileCustomers(): Promise<CustomerProfileCustomersResponse> {
  return apiRequest<CustomerProfileCustomersResponse>("/api/customer-profile/");
}

export function getCustomerProfileWeeks(
  customerId: string,
  params?: { year?: number; days?: number },
): Promise<CustomerProfileWeeksResponse> {
  const qs = new URLSearchParams();
  if (params?.year != null) qs.set("year", String(params.year));
  if (params?.days != null) qs.set("days", String(params.days));
  const query = qs.toString();
  return apiRequest<CustomerProfileWeeksResponse>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/weeks${query ? `?${query}` : ""}`,
  );
}

export function getCustomerProfileWeekDetail(
  customerId: string,
  weekKey: string,
): Promise<CustomerProfileWeekDetailResponse> {
  return apiRequest<CustomerProfileWeekDetailResponse>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/weeks/${encodeURIComponent(weekKey)}`,
  );
}

export function getCustomerProfileMaterialDetail(
  customerId: string,
  weekKey: string,
  internalPartNumber: string,
): Promise<MaterialDetailResponse> {
  return apiRequest<MaterialDetailResponse>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/weeks/${encodeURIComponent(weekKey)}/materials/${encodeURIComponent(internalPartNumber)}`,
  );
}

export function getCustomerProfileMaterials(
  customerId: string,
  params?: { year?: number; days?: number },
): Promise<CustomerProfileMaterialsResponse> {
  const qs = new URLSearchParams();
  if (params?.year != null) qs.set("year", String(params.year));
  if (params?.days != null) qs.set("days", String(params.days));
  const query = qs.toString();
  return apiRequest<CustomerProfileMaterialsResponse>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/materials${query ? `?${query}` : ""}`,
  );
}

export function getMaterialWeeklyProfile(
  customerId: string,
  internalPartNumber: string,
  params?: { year?: number; days?: number },
): Promise<MaterialWeeklyProfileResponse> {
  const qs = new URLSearchParams();
  if (params?.year != null) qs.set("year", String(params.year));
  if (params?.days != null) qs.set("days", String(params.days));
  const query = qs.toString();
  return apiRequest<MaterialWeeklyProfileResponse>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/materials/${encodeURIComponent(internalPartNumber)}/weekly-profile${query ? `?${query}` : ""}`,
  );
}

export function getCustomerProfileScorecard(
  customerId: string,
  params?: { days?: number },
): Promise<CustomerScorecardResponse> {
  const qs = new URLSearchParams();
  if (params?.days != null) qs.set("days", String(params.days));
  const query = qs.toString();
  return apiRequest<CustomerScorecardResponse>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/scorecard${query ? `?${query}` : ""}`,
  );
}

export function getMaterialShippingForecast(
  customerId: string,
  internalPartNumber: string,
  days: number = 90,
): Promise<MaterialShippingForecastResponse> {
  return apiRequest<MaterialShippingForecastResponse>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/materials/${encodeURIComponent(internalPartNumber)}/shipping-forecast?days=${days}`,
  );
}
