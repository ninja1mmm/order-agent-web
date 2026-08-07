"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerConfig } from "@/services/settings";

type BasicInfoFormProps = {
  draft: CustomerConfig;
  onDraftChange: (draft: CustomerConfig) => void;
  onAddContact: () => void;
  onRemoveContact: (index: number) => void;
};

export function BasicInfoForm({
  draft,
  onDraftChange,
  onAddContact,
  onRemoveContact,
}: BasicInfoFormProps) {
  return (
    <div className="settings-basic-tab">
      <div className="grid-2">
        <label className="filter-field">
          <span className="filter-label">客户</span>
          <Input
            value={draft.name}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
          />
        </label>
        <label className="filter-field">
          <span className="filter-label">客户编码</span>
          <Input
            value={draft.code}
            onChange={(event) => onDraftChange({ ...draft, code: event.target.value })}
          />
        </label>
        <label className="filter-field">
          <span className="filter-label">客服</span>
          <Input
            value={draft.customerServiceRep ?? ""}
            placeholder="客服负责人"
            onChange={(event) => {
              onDraftChange({
                ...draft,
                customerServiceRep: event.target.value || null,
              });
            }}
          />
        </label>
      </div>

      <div className="row" style={{ marginTop: 14, marginBottom: 8 }}>
        <div>
          <p className="mini-title" style={{ marginBottom: 0 }}>联系人与邮箱</p>
          <p className="item-meta">可维护多个客户联系人和邮件地址。</p>
        </div>
        <Button variant="default" size="sm" onClick={onAddContact}>
          <Plus className="h-3.5 w-3.5" /> 新增
        </Button>
      </div>

      <div className="scroll-x">
        <table className="table settings-contact-table">
          <thead>
            <tr>
              <th>客户姓名</th>
              <th>客户邮箱</th>
              <th style={{ width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {draft.contacts.map((contact, index) => (
              <tr key={contact.contactId ?? index}>
                <td>
                  <Input
                    value={contact.name ?? ""}
                    placeholder="客户姓名"
                    onChange={(event) => {
                      const contacts = [...draft.contacts];
                      contacts[index] = { ...contact, name: event.target.value || null };
                      onDraftChange({ ...draft, contacts });
                    }}
                  />
                </td>
                <td>
                  <Input
                    value={contact.email}
                    placeholder="example@company.com"
                    onChange={(event) => {
                      const contacts = [...draft.contacts];
                      contacts[index] = { ...contact, email: event.target.value };
                      onDraftChange({ ...draft, contacts });
                    }}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-link"
                    onClick={() => onRemoveContact(index)}
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {draft.contacts.length === 0 ? (
          <p className="item-meta" style={{ marginTop: 12 }}>暂无联系人和邮箱，点击「新增」添加。</p>
        ) : null}
      </div>
    </div>
  );
}
