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

export function transformCustomerProfileCustomersToModel(
  response: CustomerProfileCustomersResponseSchema,
): CustomerProfileCustomersResponse {
  return response;
}

export function transformCustomerProfileWeeksToModel(
  response: CustomerProfileWeeksResponseSchema,
): CustomerProfileWeeksResponse {
  return response;
}

export function transformCustomerProfileWeekDetailToModel(
  response: CustomerProfileWeekDetailResponseSchema,
): CustomerProfileWeekDetailResponse {
  return response;
}

export function transformMaterialDetailToModel(
  response: MaterialDetailResponseSchema,
): MaterialDetailResponse {
  return response;
}

export function transformCustomerProfileMaterialsToModel(
  response: CustomerProfileMaterialsResponseSchema,
): CustomerProfileMaterialsResponse {
  return response;
}

export function transformMaterialWeeklyProfileToModel(
  response: MaterialWeeklyProfileResponseSchema,
): MaterialWeeklyProfileResponse {
  return response;
}

export function transformCustomerScorecardToModel(
  response: CustomerScorecardResponseSchema,
): CustomerScorecardResponse {
  return response;
}

export function transformMaterialShippingForecastToModel(
  response: MaterialShippingForecastResponseSchema,
): MaterialShippingForecastResponse {
  return response;
}
