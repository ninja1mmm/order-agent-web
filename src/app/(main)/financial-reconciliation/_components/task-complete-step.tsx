"use client";

import { Download, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReconciliationTask } from "@/services/reconciliation";
import { formatDateTime } from "./reconciliation-utils";

export function TaskCompleteStep({ task }: { task: ReconciliationTask | null }) {
  return (
    <div className="recon-step">
      <div className="row">
        <div>
          <p className="mini-title">完成与输出</p>
          <p className="item-meta">任务关闭后可在此查看关闭信息；导出和打印等待后端 API 提供。</p>
        </div>
        <div className="list-actions">
          <Button variant="default" disabled tooltip="后端暂未提供 export API">
            <Download className="h-3.5 w-3.5" /> 导出
          </Button>
          <Button variant="default" disabled tooltip="后端暂未提供 print API">
            <Printer className="h-3.5 w-3.5" /> 打印
          </Button>
        </div>
      </div>
      <div className="recon-complete-grid">
        <div className="result-block">
          <span className="filter-label">任务状态</span>
          <Badge variant={task?.statusVariant ?? "slate"}>{task?.statusLabel ?? "-"}</Badge>
        </div>
        <div className="result-block">
          <span className="filter-label">关闭时间</span>
          <strong>{formatDateTime(task?.closedAt)}</strong>
        </div>
        <div className="result-block">
          <span className="filter-label">输出能力</span>
          <strong>等待后端接口</strong>
        </div>
      </div>
    </div>
  );
}
