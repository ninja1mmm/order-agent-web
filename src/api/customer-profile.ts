import { apiRequest } from "./client";
import type {
  CustomerProfileCustomersResponseSchema,
  CustomerProfileMaterialsResponseSchema,
  CustomerProfileWeekDetailResponseSchema,
  CustomerProfileWeeksResponseSchema,
  CustomerScorecardResponseSchema,
  MaterialDetailResponseSchema,
  MaterialShippingForecastResponseSchema,
  MaterialWeeklyProfileResponseSchema,
} from "@/types/schemas/customer-profile";

function buildOptionalPeriodQuery(params?: { year?: number; days?: number }): string {
  const qs = new URLSearchParams();
  if (params?.year != null) qs.set("year", String(params.year));
  if (params?.days != null) qs.set("days", String(params.days));
  return qs.toString();
}

export function getCustomerProfileCustomersSchema(): Promise<CustomerProfileCustomersResponseSchema> {
  return apiRequest<CustomerProfileCustomersResponseSchema>("/api/customer-profile/");
}

export function getCustomerProfileWeeksSchema(
  customerId: string,
  params?: { year?: number; days?: number },
): Promise<CustomerProfileWeeksResponseSchema> {
  const query = buildOptionalPeriodQuery(params);
  return apiRequest<CustomerProfileWeeksResponseSchema>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/weeks${query ? `?${query}` : ""}`,
  );
}

export function getCustomerProfileWeekDetailSchema(
  customerId: string,
  weekKey: string,
): Promise<CustomerProfileWeekDetailResponseSchema> {
  return apiRequest<CustomerProfileWeekDetailResponseSchema>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/weeks/${encodeURIComponent(weekKey)}`,
  );
}

export function getCustomerProfileMaterialDetailSchema(
  customerId: string,
  weekKey: string,
  internalPartNumber: string,
): Promise<MaterialDetailResponseSchema> {
  return apiRequest<MaterialDetailResponseSchema>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/weeks/${encodeURIComponent(weekKey)}/materials/${encodeURIComponent(internalPartNumber)}`,
  );
}

export function getCustomerProfileMaterialsSchema(
  customerId: string,
  params?: { year?: number; days?: number },
): Promise<CustomerProfileMaterialsResponseSchema> {
  const query = buildOptionalPeriodQuery(params);
  return apiRequest<CustomerProfileMaterialsResponseSchema>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/materials${query ? `?${query}` : ""}`,
  );
}

export function getMaterialWeeklyProfileSchema(
  customerId: string,
  internalPartNumber: string,
  params?: { year?: number; days?: number },
): Promise<MaterialWeeklyProfileResponseSchema> {
  const query = buildOptionalPeriodQuery(params);
  return apiRequest<MaterialWeeklyProfileResponseSchema>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/materials/${encodeURIComponent(internalPartNumber)}/weekly-profile${query ? `?${query}` : ""}`,
  );
}

export function getCustomerProfileScorecardSchema(
  customerId: string,
  params?: { days?: number },
): Promise<CustomerScorecardResponseSchema> {
  const qs = new URLSearchParams();
  if (params?.days != null) qs.set("days", String(params.days));
  const query = qs.toString();
  return apiRequest<CustomerScorecardResponseSchema>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/scorecard${query ? `?${query}` : ""}`,
  );
}

export function getMaterialShippingForecastSchema(
  customerId: string,
  internalPartNumber: string,
  days = 90,
): Promise<MaterialShippingForecastResponseSchema> {
  return apiRequest<MaterialShippingForecastResponseSchema>(
    `/api/customer-profile/${encodeURIComponent(customerId)}/materials/${encodeURIComponent(internalPartNumber)}/shipping-forecast?days=${days}`,
  );
}
