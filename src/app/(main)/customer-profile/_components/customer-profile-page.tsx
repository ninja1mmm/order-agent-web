"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  getCustomerProfileCustomers,
  getCustomerProfileMaterials,
  getMaterialWeeklyProfile,
  type CustomerProfileCustomer,
  type CustomerProfileMaterial,
  type CustomerProfileViewMode,
  type MaterialWeeklyProfileResponse,
} from "@/services/customer-profile";
import { CustomerListPanel } from "./customer-list-panel";
import { CustomerScorecardPanel } from "./customer-scorecard-panel";
import { currentYear } from "./customer-profile-utils";
import { WeekOverviewPanel } from "./week-overview-panel";

export function CustomerProfilePage() {
  const [customers, setCustomers] = useState<CustomerProfileCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CustomerProfileViewMode>("year");
  const [year, setYear] = useState(currentYear());
  const [materials, setMaterials] = useState<CustomerProfileMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [weeklyProfile, setWeeklyProfile] = useState<MaterialWeeklyProfileResponse | null>(null);

  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const handleCustomerSelect = useCallback((customerId: string) => {
    setSelectedCustomerId(customerId);
    setMaterials([]);
    setSelectedMaterial(null);
    setWeeklyProfile(null);
  }, []);

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const response = await getCustomerProfileCustomers();
      setCustomers(response.customers);
      setSelectedCustomerId((current) => {
        if (current && response.customers.some((customer) => customer.id === current)) return current;
        return response.customers[0]?.id ?? null;
      });
    } catch {
      setCustomers([]);
      setSelectedCustomerId(null);
      setMaterials([]);
      setSelectedMaterial(null);
      setWeeklyProfile(null);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchCustomers() {
      setLoadingCustomers(true);
      try {
        const response = await getCustomerProfileCustomers();
        if (cancelled) return;
        setCustomers(response.customers);
        setSelectedCustomerId((current) => {
          if (current && response.customers.some((customer) => customer.id === current)) return current;
          return response.customers[0]?.id ?? null;
        });
      } catch {
        if (cancelled) return;
        setCustomers([]);
        setSelectedCustomerId(null);
        setMaterials([]);
        setSelectedMaterial(null);
        setWeeklyProfile(null);
      } finally {
        if (!cancelled) setLoadingCustomers(false);
      }
    }

    void fetchCustomers();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
      return;
    }

    let cancelled = false;
    const customerId = selectedCustomerId;
    const params = viewMode === "year" ? { year } : { days: Number(viewMode) };

    async function fetchMaterials() {
      setLoadingMaterials(true);
      try {
        const response = await getCustomerProfileMaterials(customerId, params);
        if (cancelled) return;
        setMaterials(response.materials);
        setSelectedMaterial((current) => {
          if (current && response.materials.some((material) => material.internalPartNumber === current)) {
            return current;
          }
          return response.materials[0]?.internalPartNumber ?? null;
        });
        setWeeklyProfile(null);
      } catch {
        if (cancelled) return;
        setMaterials([]);
        setSelectedMaterial(null);
        setWeeklyProfile(null);
      } finally {
        if (!cancelled) setLoadingMaterials(false);
      }
    }

    void fetchMaterials();
    return () => { cancelled = true; };
  }, [selectedCustomerId, viewMode, year]);

  useEffect(() => {
    if (!selectedCustomerId || !selectedMaterial) {
      return;
    }

    let cancelled = false;
    const customerId = selectedCustomerId;
    const internalPartNumber = selectedMaterial;
    const params = viewMode === "year" ? { year } : { days: Number(viewMode) };

    async function fetchWeeklyProfile() {
      setLoadingProfile(true);
      try {
        const response = await getMaterialWeeklyProfile(customerId, internalPartNumber, params);
        if (cancelled) return;
        setWeeklyProfile(response);
      } catch {
        if (cancelled) return;
        setWeeklyProfile(null);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }

    void fetchWeeklyProfile();
    return () => { cancelled = true; };
  }, [selectedCustomerId, selectedMaterial, viewMode, year]);

  return (
    <>
      <div className="subnav">
        <Link className="active" href="/customer-profile">
          客户画像
        </Link>
        <span className="subnav-disabled">财务对账</span>
      </div>
      <div className="grid-3 screen-fill">
        <CustomerListPanel
          customers={customers}
          selectedId={selectedCustomerId}
          loading={loadingCustomers}
          onSelect={handleCustomerSelect}
          onRefresh={() => { void loadCustomers(); }}
        />
        <WeekOverviewPanel
          viewMode={viewMode}
          year={year}
          materials={selectedCustomerId ? materials : []}
          selectedMaterial={selectedMaterial}
          weeklyProfile={weeklyProfile}
          loadingMaterials={loadingMaterials}
          loadingProfile={loadingProfile}
          onViewModeChange={setViewMode}
          onYearChange={setYear}
          onMaterialSelect={setSelectedMaterial}
        />
        <CustomerScorecardPanel key={selectedCustomerId ?? "no-customer"} customerId={selectedCustomerId} />
      </div>
    </>
  );
}
