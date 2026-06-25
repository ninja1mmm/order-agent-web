"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Save, RefreshCw, Trash2 } from "lucide-react";

import {
  createCustomer,
  deleteCustomer,
  getMailboxSettings,
  listCustomers,
  testMailboxConnection,
  updateCustomer,
  type CustomerConfig,
  type MailboxSettings,
} from "../../../services/settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "./shared";

type SettingsSection = "customers" | "mailbox";
type CustomerTab = "basic" | "recognition" | "materials";

export function LiveSystemSettings() {
  const [section, setSection] = useState<SettingsSection>("customers");
  const [customers, setCustomers] = useState<CustomerConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<CustomerConfig | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<CustomerTab>("basic");
  const [mailbox, setMailbox] = useState<MailboxSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    const items = await listCustomers();
    setCustomers(items);
    if (!selectedId && items.length > 0) {
      setSelectedId(items[0].id);
      setDraft({
        ...items[0],
        contacts: items[0].contacts?.map((c) => ({ ...c })) ?? [],
        materialMappings: (items[0].materialMappings ?? []).map((m) => ({ ...m })),
        submissionSchedules: (items[0].submissionSchedules ?? []).map((s) => ({ ...s })),
      });
    }
  }, [selectedId]);

  const loadMailbox = useCallback(async () => {
    setMailbox(await getMailboxSettings());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers().catch(() => setMessage("加载客户配置失败"));
      loadMailbox().catch(() => setMessage("加载邮箱配置失败"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomers, loadMailbox]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (section === "mailbox") loadMailbox().catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [section, loadMailbox]);

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
    setDraft({
      ...customer,
      contacts: customer.contacts.map((c) => ({ ...c })),
      materialMappings: (customer.materialMappings ?? []).map((mapping) => ({ ...mapping })),
      submissionSchedules: (customer.submissionSchedules ?? []).map((s) => ({ ...s })),
    });
    setTab("basic");
  };

  const handleAddCustomer = async () => {
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
  };

  const handleSaveCustomer = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await updateCustomer(draft.id, draft);
      await loadCustomers();
      selectCustomer(saved);
      setMessage("保存成功");
    } catch {
      setMessage("保存失败");
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
    setMessage(null);
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
      setMessage("客户已删除");
    } catch {
      setMessage("删除客户失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMaterial = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      materialMappings: [
        ...(draft.materialMappings ?? []),
        {
          mappingId: crypto.randomUUID(),
          customerPartNumber: "",
          internalPartNumber: "",
          scheduleAgreement: null,
          productType: null,
          productionLine: null,
          oem: null,
          program: null,
          product: null,
          status: "active",
        },
      ],
    });
  };

  const handleRemoveMaterial = (index: number) => {
    if (!draft) return;
    const materialMappings = [...(draft.materialMappings ?? [])];
    materialMappings.splice(index, 1);
    setDraft({ ...draft, materialMappings });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const result = await testMailboxConnection();
      setMessage(result.ok ? `连接成功：${result.message}` : `连接失败：${result.message}`);
      await loadMailbox();
    } catch {
      setMessage("连接测试请求失败，请检查后端服务是否启动");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="settings-grid screen-fill">
      <aside className="panel scroll-panel">
        <div className="panel-head">
          <h2 className="panel-title">配置菜单</h2>
        </div>
        <div className="panel-body stack">
          <button
            type="button"
            className={`settings-nav ${section === "customers" ? "selected" : ""}`}
            onClick={() => { setSection("customers"); setMessage(null); }}
          >
            <span>客户配置</span>
            <small>基础信息、联系人识别、物料映射</small>
          </button>
          <button
            type="button"
            className={`settings-nav ${section === "mailbox" ? "selected" : ""}`}
            onClick={() => { setSection("mailbox"); setMessage(null); }}
          >
            <span>统一邮箱</span>
            <small>监听邮箱、同步、连接测试</small>
          </button>
        </div>
      </aside>

      <section className="panel scroll-panel">
        {section === "customers" ? (
          <>
            <div className="panel-head">
              <h2 className="panel-title">客户配置</h2>
              <div className="list-actions">
                <Button variant="default" size="sm" onClick={handleAddCustomer}>
                  <Plus className="h-3.5 w-3.5" /> 新增客户
                </Button>
                <Button variant="primary" size="sm" disabled={!draft || saving} onClick={handleSaveCustomer}>
                  <Save className="h-3.5 w-3.5" /> {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
            <div className="panel-body" style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: 16 }}>
              {message ? <p className="item-meta" style={{ marginBottom: 12 }}>{message}</p> : null}
              <div className="settings-inner-split" style={{ height: "100%" }}>
                <div className="customer-list-col">
                  <div className="row" style={{ marginBottom: 8 }}>
                    <p className="mini-title" style={{ marginBottom: 0 }}>客户列表</p>
                    <Badge variant="blue">{filteredCustomers.length}</Badge>
                  </div>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="搜索客户"
                    style={{ marginBottom: 10 }}
                  />
                  <div className="customer-list-scroll">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`list-item customer-card ${customer.id === selectedId ? "selected" : ""}`}
                      >
                        <button type="button" className="customer-card-main" onClick={() => selectCustomer(customer)}>
                          <p className="item-title" title={customer.id === selectedId && draft ? draft.name : customer.name}>
                            {customer.id === selectedId && draft ? draft.name : customer.name}
                          </p>
                          <p className="item-meta">
                            {(customer.id === selectedId && draft ? draft.code : customer.code) || "-"}
                          </p>
                        </button>
                        <button
                          type="button"
                          className="icon-link customer-card-delete"
                          onClick={() => handleDeleteCustomer(customer)}
                          title="删除客户"
                          aria-label={`删除客户 ${customer.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {filteredCustomers.length === 0 ? <p className="item-meta">暂无客户配置</p> : null}
                  </div>
                </div>

                {draft ? (
                  <div className="settings-detail-col">
                    <div className="row" style={{ marginBottom: 10 }}>
                      <p className="item-title">{draft.name}</p>
                    </div>
                    <div className="tabs settings-tabs">
                      <span className={tab === "basic" ? "active" : ""} onClick={() => setTab("basic")}>基础信息</span>
                      <span className={tab === "recognition" ? "active" : ""} onClick={() => setTab("recognition")}>联系人识别</span>
                      <span className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")}>物料映射</span>
                    </div>

                    {tab === "basic" ? (
                      <div className="grid-2" style={{ marginTop: 12 }}>
                        <label className="filter-field">
                          <span className="filter-label">客户名称</span>
                          <Input
                            value={draft.name}
                            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                          />
                        </label>
                        <label className="filter-field">
                          <span className="filter-label">客户编码</span>
                          <Input
                            value={draft.code}
                            onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                          />
                        </label>
                        <label className="filter-field">
                          <span className="filter-label">缩写</span>
                          <Input
                            value={draft.abbreviation}
                            onChange={(event) => setDraft({ ...draft, abbreviation: event.target.value })}
                          />
                        </label>
                      </div>
                    ) : tab === "recognition" ? (
                      <div style={{ marginTop: 12 }}>
                        <div className="row" style={{ marginBottom: 8 }}>
                          <p className="mini-title" style={{ marginBottom: 0 }}>联系人识别</p>
                          <Button variant="default" size="sm" onClick={handleAddContact}>
                            <Plus className="h-3.5 w-3.5" /> 新增
                          </Button>
                        </div>
                        <p className="item-meta" style={{ marginBottom: 10 }}>只有匹配到已配置联系人的邮件才会被抓取。</p>
                        <div className="scroll-x">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>邮箱地址</th>
                                <th style={{ width: 48 }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {draft.contacts.map((contact, index) => (
                                <tr key={contact.contactId ?? index}>
                                  <td>
                                    <Input
                                      value={contact.email}
                                      placeholder="example@company.com"
                                      onChange={(event) => {
                                        const contacts = [...draft.contacts];
                                        contacts[index] = { ...contact, email: event.target.value };
                                        setDraft({ ...draft, contacts });
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <button type="button" className="icon-link" onClick={() => handleRemoveContact(index)} title="删除">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {draft.contacts.length === 0 ? (
                            <p className="item-meta" style={{ marginTop: 12 }}>暂无联系人配置，点击「新增」添加。</p>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="settings-material-tab">
                        <div className="row" style={{ marginBottom: 8 }}>
                          <p className="mini-title" style={{ marginBottom: 0 }}>物料映射</p>
                          <div className="list-actions">
                            <Button variant="default" size="sm" onClick={handleAddMaterial}>
                              <Plus className="h-3.5 w-3.5" /> 新增
                            </Button>
                          </div>
                        </div>
                        <div className="scroll-x settings-material-table">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Customer P/N</th>
                                <th>Internal P/N</th>
                                <th style={{ width: 48 }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(draft.materialMappings ?? []).map((mapping, index) => (
                                <tr key={mapping.mappingId}>
                                  <td>
                                    <Input
                                      value={mapping.customerPartNumber}
                                      placeholder="Customer P/N"
                                      onChange={(event) => {
                                        const materialMappings = [...(draft.materialMappings ?? [])];
                                        materialMappings[index] = {
                                          ...mapping,
                                          customerPartNumber: event.target.value,
                                        };
                                        setDraft({ ...draft, materialMappings });
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      value={mapping.internalPartNumber}
                                      placeholder="Internal P/N"
                                      onChange={(event) => {
                                        const materialMappings = [...(draft.materialMappings ?? [])];
                                        materialMappings[index] = {
                                          ...mapping,
                                          internalPartNumber: event.target.value,
                                        };
                                        setDraft({ ...draft, materialMappings });
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <button type="button" className="icon-link" onClick={() => handleRemoveMaterial(index)} title="删除">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {(draft.materialMappings ?? []).length === 0 ? (
                            <p className="item-meta" style={{ marginTop: 12 }}>暂无物料映射，点击「新增」添加。</p>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="item-meta">请选择或新增客户</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="panel-head">
              <h2 className="panel-title">统一邮箱</h2>
              <div className="list-actions">
                <Button
                  variant={testing ? "primary" : "default"}
                  size="sm"
                  disabled={testing}
                  className={testing ? "btn-parsing" : ""}
                  onClick={handleTestConnection}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
                  {testing ? "测试中..." : "测试连接"}
                </Button>
              </div>
            </div>
            <div className="panel-body stack">
              {message ? (
                <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "white" }}>
                  <p className="item-meta" style={{ margin: 0, color: message.includes("成功") ? "var(--success)" : "var(--danger)" }}>
                    {message}
                  </p>
                </div>
              ) : null}
              {mailbox ? (
                <>
                  <div className="grid-2">
                    <label className="filter-field">
                      <span className="filter-label">邮箱地址</span>
                      <span className="filter-value">{mailbox.address || "-"}</span>
                    </label>
                    <label className="filter-field">
                      <span className="filter-label">服务类型</span>
                      <span className="filter-value">{mailbox.providerType}</span>
                    </label>
                    <label className="filter-field">
                      <span className="filter-label">IMAP 服务器</span>
                      <span className="filter-value">{mailbox.host}:{mailbox.port}</span>
                    </label>
                    <label className="filter-field">
                      <span className="filter-label">同步间隔</span>
                      <span className="filter-value">{mailbox.syncIntervalSeconds} 秒</span>
                    </label>
                    <label className="filter-field">
                      <span className="filter-label">状态</span>
                      <span className="filter-value">
                        <Badge variant={mailbox.enabled ? "green" : "slate"}>
                          {mailbox.enabled ? "已启用" : "已停用"}
                        </Badge>
                      </span>
                    </label>
                    <label className="filter-field">
                      <span className="filter-label">连接状态</span>
                      <span className="filter-value">
                        <Badge variant={mailbox.connected ? "green" : "red"}>
                          {mailbox.connected ? "已连接" : "未连接"}
                        </Badge>
                      </span>
                    </label>
                    <label className="filter-field">
                      <span className="filter-label">上次同步</span>
                      <span className="filter-value">
                        {mailbox.lastSyncAt ? formatDateTime(mailbox.lastSyncAt, "zh-CN") : "-"}
                      </span>
                    </label>
                    <label className="filter-field">
                      <span className="filter-label">最近轮询</span>
                      <span className="filter-value">
                        收到 {mailbox.lastReceived} / 入库 {mailbox.lastCreated} / 跳过 {mailbox.lastSkipped}
                      </span>
                    </label>
                  </div>
                  <div className="card">
                    <div className="row">
                      <div>
                        <p className="item-title">密钥不在页面明文展示</p>
                        <p className="item-meta">
                          邮箱密码通过环境变量 IMAP_PASSWORD 配置，页面仅显示连接状态和同步结果。
                        </p>
                        {mailbox.lastError ? (
                          <p className="item-meta" style={{ color: "var(--danger)", marginTop: 6 }}>
                            最近错误：{mailbox.lastError}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant={mailbox.enabled ? "blue" : "slate"}>
                        {mailbox.enabled ? "enabled" : "disabled"}
                      </Badge>
                    </div>
                  </div>
                </>
              ) : (
                <p className="item-meta">加载中...</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
