"use client";

import { Input } from "@/components/ui/input";
import type { CustomerConfig } from "@/services/settings";

type BasicInfoFormProps = {
  draft: CustomerConfig;
  onDraftChange: (draft: CustomerConfig) => void;
};

export function BasicInfoForm({ draft, onDraftChange }: BasicInfoFormProps) {
  return (
    <div className="grid-2" style={{ marginTop: 12 }}>
      <label className="filter-field">
        <span className="filter-label">客户名称</span>
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
        <span className="filter-label">缩写</span>
        <Input
          value={draft.abbreviation}
          onChange={(event) => onDraftChange({ ...draft, abbreviation: event.target.value })}
        />
      </label>
    </div>
  );
}
