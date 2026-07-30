import {
  getCustomerProfileCustomersSchema,
  getCustomerProfileMaterialDetailSchema,
  getCustomerProfileMaterialsSchema,
  getCustomerProfileScorecardSchema,
  getCustomerProfileWeekDetailSchema,
  getCustomerProfileWeeksSchema,
  getMaterialShippingForecastSchema,
  getMaterialWeeklyProfileSchema,
} from "@/api/customer-profile";
import {
  transformCustomerProfileCustomersToModel,
  transformCustomerProfileMaterialsToModel,
  transformCustomerProfileWeekDetailToModel,
  transformCustomerProfileWeeksToModel,
  transformCustomerScorecardToModel,
  transformMaterialDetailToModel,
  transformMaterialShippingForecastToModel,
  transformMaterialWeeklyProfileToModel,
} from "@/lib/transforms/customer-profile";
import type {
  CustomerProfileCustomersResponse,
  CustomerProfileMaterialsResponse,
  CustomerProfileWeekDetailResponse,
  CustomerProfileWeeksResponse,
  CustomerScorecardResponse,
  MaterialDetailResponse,
  MaterialShippingForecastResponse,
  MaterialWeeklyProfileResponse,
} from "@/types/models/customer-profile";

export type {
  CustomerProfileCustomer,
  CustomerProfileCustomersResponse,
  CustomerProfileMaterial,
  CustomerProfileMaterialsResponse,
  CustomerProfileViewMode,
  CustomerProfileWeek,
  CustomerProfileWeekDetailResponse,
  CustomerProfileWeeksResponse,
  CustomerScoreBiasDirection,
  CustomerScoreMetricDetail,
  CustomerScoreMetricKey,
  CustomerScorecardCurrent,
  CustomerScorecardExplanation,
  CustomerScorecardResponse,
  CustomerScorecardTimelinePoint,
  ForecastTrend,
  ForecastVersionColumn,
  MaterialChartPoint,
  MaterialDetailResponse,
  MaterialForecastVersion,
  MaterialShippingForecastResponse,
  MaterialWeeklyProfilePoint,
  MaterialWeeklyProfileResponse,
  ShippingForecastPoint,
  WeekForecastComparisonRow,
  WeekShippingRow,
} from "@/types/models/customer-profile";

export async function getCustomerProfileCustomers(): Promise<CustomerProfileCustomersResponse> {
  const response = await getCustomerProfileCustomersSchema();
  return transformCustomerProfileCustomersToModel(response);
}

export async function getCustomerProfileWeeks(
  customerId: string,
  params?: { year?: number; days?: number },
): Promise<CustomerProfileWeeksResponse> {
  const response = await getCustomerProfileWeeksSchema(customerId, params);
  return transformCustomerProfileWeeksToModel(response);
}

export async function getCustomerProfileWeekDetail(
  customerId: string,
  weekKey: string,
): Promise<CustomerProfileWeekDetailResponse> {
  const response = await getCustomerProfileWeekDetailSchema(customerId, weekKey);
  return transformCustomerProfileWeekDetailToModel(response);
}

export async function getCustomerProfileMaterialDetail(
  customerId: string,
  weekKey: string,
  internalPartNumber: string,
): Promise<MaterialDetailResponse> {
  const response = await getCustomerProfileMaterialDetailSchema(
    customerId,
    weekKey,
    internalPartNumber,
  );
  return transformMaterialDetailToModel(response);
}

export async function getCustomerProfileMaterials(
  customerId: string,
  params?: { year?: number; days?: number },
): Promise<CustomerProfileMaterialsResponse> {
  const response = await getCustomerProfileMaterialsSchema(customerId, params);
  return transformCustomerProfileMaterialsToModel(response);
}

export async function getMaterialWeeklyProfile(
  customerId: string,
  internalPartNumber: string,
  params?: { year?: number; days?: number },
): Promise<MaterialWeeklyProfileResponse> {
  const response = await getMaterialWeeklyProfileSchema(customerId, internalPartNumber, params);
  return transformMaterialWeeklyProfileToModel(response);
}

export async function getCustomerProfileScorecard(
  customerId: string,
  params?: { days?: number },
): Promise<CustomerScorecardResponse> {
  const response = await getCustomerProfileScorecardSchema(customerId, params);
  return transformCustomerScorecardToModel(response);
}

export async function getMaterialShippingForecast(
  customerId: string,
  internalPartNumber: string,
  days = 90,
): Promise<MaterialShippingForecastResponse> {
  const response = await getMaterialShippingForecastSchema(customerId, internalPartNumber, days);
  return transformMaterialShippingForecastToModel(response);
}
