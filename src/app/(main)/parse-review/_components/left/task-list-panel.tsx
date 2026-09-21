"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterSelect, SearchableFilterSelect } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WorkspaceTask } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import {
  type Locale,
  copy,
  customerLabelFromId,
  formatDateTime,
  taskStatusLabel,
} from "../../../_components/shared";

type FilterOption = string | { value: string; label: string };

type TaskListPanelProps = {
  locale: Locale;
  tasks: WorkspaceTask[];
  selectedTask: WorkspaceTask | undefined;
  customers: CustomerConfig[];
  customerFilter: string;
  statusFilter: string;
  timeFilter: string;
  customerOptions: FilterOption[];
  statusOptions: FilterOption[];
  onCustomerFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onTimeFilterChange: (value: string) => void;
  onSelectTask: (taskId: string) => void;
  onRefresh: () => void;
};

export function TaskListPanel({
  locale,
  tasks,
  selectedTask,
  customers,
  customerFilter,
  statusFilter,
  timeFilter,
  customerOptions,
  statusOptions,
  onCustomerFilterChange,
  onStatusFilterChange,
  onTimeFilterChange,
  onSelectTask,
  onRefresh,
}: TaskListPanelProps) {
  const t = copy[locale];
  const selectedKey = selectedTask ? taskInstanceKey(selectedTask) : "";

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">{t.attachmentTasks}</h2>
        <Button variant="ghost" size="icon" aria-label={t.refresh} onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="panel-body stack scrollbar-hidden">
        <div className="filter-bar" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <SearchableFilterSelect label={t.filterCustomer} value={customerFilter} options={customerOptions} onChange={onCustomerFilterChange} />
          <FilterSelect
            label={t.filterStatus}
            value={statusFilter}
            options={statusOptions}
            onChange={onStatusFilterChange}
          />
          <FilterSelect
            label={t.filterTime}
            value={timeFilter}
            options={["今天", "最近 7 天", "最近 30 天", "最近 60 天"]}
            onChange={onTimeFilterChange}
          />
        </div>
        {tasks.map((task) => {
          const taskLabel = task.attachmentId === null ? "Email Body" : (task.attachmentFileName ?? task.id);
          const instanceKey = taskInstanceKey(task);

          return (
            <button
              type="button"
              key={instanceKey}
              className={`list-item ${instanceKey === selectedKey ? "selected" : ""}`}
              onClick={() => onSelectTask(task.id)}
            >
              <Tooltip><TooltipTrigger asChild><p className="item-title task-filename">{taskLabel}</p></TooltipTrigger><TooltipContent>{taskLabel}</TooltipContent></Tooltip>
              <p className="item-meta task-status-desc">
                {customerLabelFromId(customers, task.customerId, task.customerName)} · {t.receivedAt} {formatDateTime(task.receivedAt ?? task.mailCreatedAt, locale)} ·{" "}
                {taskStatusLabel(task.status, locale)}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function taskInstanceKey(task: WorkspaceTask) {
  return `${task.mailMessageId}::${task.attachmentId ?? "__body__"}`;
}
