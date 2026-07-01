"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerConfig } from "@/services/settings";

type ContactsTabProps = {
  draft: CustomerConfig;
  onDraftChange: (draft: CustomerConfig) => void;
  onAddContact: () => void;
  onRemoveContact: (index: number) => void;
};

export function ContactsTab({
  draft,
  onDraftChange,
  onAddContact,
  onRemoveContact,
}: ContactsTabProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="row" style={{ marginBottom: 8 }}>
        <p className="mini-title" style={{ marginBottom: 0 }}>联系人识别</p>
        <Button variant="default" size="sm" onClick={onAddContact}>
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
                      onDraftChange({ ...draft, contacts });
                    }}
                  />
                </td>
                <td>
                  <button type="button" className="icon-link" onClick={() => onRemoveContact(index)} title="删除">
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
  );
}
