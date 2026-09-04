"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createCustomer,
  deleteCustomer,
  getMailboxSettings,
  listCustomers,
  testMailboxConnection,
  updateCustomer,
  updateMailboxSettings,
  type CustomerConfig,
  type MailboxSettings,
} from "@/services/settings";
import { CustomersSection } from "./customers-section";
import { MailboxSection } from "./mailbox-section";
import type { CustomerTab, SettingsSection } from "./settings-types";

function cloneCustomerConfig(customer: CustomerConfig): CustomerConfig {
  return {
    ...customer,
    contacts: customer.contacts?.map((c) => ({ ...c })) ?? [],
    materialMappings: (customer.materialMappings ?? []).map((m) => ({ ...m })),
    submissionSchedules: (customer.submissionSchedules ?? []).map((s) => ({ ...s })),
  };
}

export function SettingsPage() {
  const params = useSearchParams();
  const [section, setSection] = useState<SettingsSection>("customers");
  const [customers, setCustomers] = useState<CustomerConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<CustomerConfig | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<CustomerTab>("basic");
  const [mailbox, setMailbox] = useState<MailboxSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const urlParamsConsumed = useRef(false);
  const [initialEditPN, setInitialEditPN] = useState<string | null>(null);
  const selectedIdRef = useRef(selectedId);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadCustomers = useCallback(async () => {
    const items = await listCustomers();
    setCustomers(items);
    if (!selectedIdRef.current && items.length > 0) {
      setSelectedId(items[0].id);
      setDraft(cloneCustomerConfig(items[0]));
    }
  }, []);

  const loadMailbox = useCallback(async () => {
    setMailbox(await getMailboxSettings());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers().catch(() => toast.error("加载客户配置失败"));
      loadMailbox().catch(() => toast.error("加载邮箱配置失败"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomers, loadMailbox]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (section === "mailbox") loadMailbox().catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [section, loadMailbox]);

  useEffect(() => {
    if (urlParamsConsumed.current || customers.length === 0) return;
    const urlCustomerId = params.get("customerId");
    const urlTab = params.get("tab");
    const urlAddPN = params.get("addPN");
    if (!urlCustomerId) return;

    urlParamsConsumed.current = true;
    const customer = customers.find((c) => c.id === urlCustomerId);
    if (!customer) return;

    const newDraft = cloneCustomerConfig(customer);

    if (urlAddPN) {
      const exists = (newDraft.materialMappings ?? []).some(
        (m) => m.customerPartNumber === urlAddPN,
      );
      if (!exists) {
        newDraft.materialMappings = [
          ...(newDraft.materialMappings ?? []),
          {
            mappingId: crypto.randomUUID(),
            customerPartNumber: urlAddPN,
            internalPartNumber: "",
            scheduleAgreement: null,
            productType: null,
            productionLine: null,
            oem: null,
            program: null,
            designation: null,
            deliveryLocation: null,
            status: "active",
          },
        ];
      }
      setInitialEditPN(urlAddPN);
    }

    const timer = window.setTimeout(() => {
      setSelectedId(customer.id);
      setDraft(newDraft);
      if (urlTab === "materials") setTab("materials");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [customers, params]);


  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return customers;
    return customers.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword),
    );
  }, [customers, search]);

  const selectCustomer = (customer: CustomerConfig) => {
    setSelectedId(customer.id);
    setDraft(cloneCustomerConfig(customer));
    setTab("basic");
  };

  const handleAddCustomer = async () => {
    setSaving(true);
    try {
      const ts = Date.now().toString(36).toUpperCase();
      const created = await createCustomer({
        name: `New Customer ${ts}`,
        abbreviation: ts,
        code: `CUST-${ts}`,
        contacts: [],
        materialMappings: [],
        submissionSchedules: [],
      });
      await loadCustomers();
      selectCustomer(created);
      toast.success("客户已新增");
    } catch {
      toast.error("新增客户失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await updateCustomer(draft.id, draft);
      selectedIdRef.current = saved.id;
      setSelectedId(saved.id);
      setDraft(cloneCustomerConfig(saved));
      setCustomers((items) => {
        const exists = items.some((item) => item.id === saved.id);
        if (!exists) return [...items, saved];
        return items.map((item) => (item.id === saved.id ? saved : item));
      });
      toast.success("保存成功");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAddContact = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      contacts: [
        ...draft.contacts,
        {
          name: null,
          email: "",
        },
      ],
    });
  };

  const handleRemoveContact = (index: number) => {
    if (!draft) return;
    const contacts = [...draft.contacts];
    contacts.splice(index, 1);
    setDraft({ ...draft, contacts });
  };

  const handleDeleteCustomer = async (customer: CustomerConfig) => {
    const confirmed = window.confirm(`确认删除客户「${customer.name}」？`);
    if (!confirmed) return;
    setSaving(true);
    try {
      await deleteCustomer(customer.id);
      const nextCustomers = await listCustomers();
      setCustomers(nextCustomers);
      const nextSelected = nextCustomers.find((item) => item.id !== customer.id) ?? nextCustomers[0];
      if (nextSelected) {
        selectCustomer(nextSelected);
      } else {
        setSelectedId("");
        setDraft(null);
      }
      toast.success("客户已删除");
    } catch {
      toast.error("删除客户失败");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMaterial = (index: number) => {
    if (!draft) return;
    const materialMappings = [...(draft.materialMappings ?? [])];
    materialMappings.splice(index, 1);
    setDraft({ ...draft, materialMappings });
  };

  const handleUpdateMailboxSettings = async (payload: {
    syncWindowDays?: number;
    syncIntervalSeconds?: number;
  }) => {
    try {
      const updated = await updateMailboxSettings(payload);
      setMailbox(updated);
      toast.success("设置已更新");
    } catch {
      toast.error("更新设置失败");
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await testMailboxConnection();
      if (result.ok) {
        toast.success(`连接成功：${result.message}`);
      } else {
        toast.error(`连接失败：${result.message}`);
      }
      await loadMailbox();
    } catch {
      toast.error("连接测试请求失败，请检查后端服务是否启动");
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div className="subnav settings-subnav" aria-label="系统配置导航">
        <button
          type="button"
          className={section === "customers" ? "active" : ""}
          aria-pressed={section === "customers"}
          onClick={() => setSection("customers")}
        >
          客户配置
        </button>
        <button
          type="button"
          className={section === "mailbox" ? "active" : ""}
          aria-pressed={section === "mailbox"}
          onClick={() => setSection("mailbox")}
        >
          统一邮箱
        </button>
      </div>
      <section className="panel scroll-panel screen-fill">
        {section === "customers" ? (
          <CustomersSection
            customers={filteredCustomers}
            selectedId={selectedId}
            draft={draft}
            search={search}
            tab={tab}
            saving={saving}
            onSearchChange={setSearch}
            onSelectCustomer={selectCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onAddCustomer={handleAddCustomer}
            onSaveCustomer={handleSaveCustomer}
            onDraftChange={setDraft}
            onTabChange={setTab}
            onAddContact={handleAddContact}
            onRemoveContact={handleRemoveContact}
            onRemoveMaterial={handleRemoveMaterial}
            initialEditPN={initialEditPN}
          />
        ) : (
          <MailboxSection
            mailbox={mailbox}
            testing={testing}
            onTestConnection={handleTestConnection}
            onUpdateSettings={handleUpdateMailboxSettings}
          />
        )}
      </section>
    </>
  );
}
