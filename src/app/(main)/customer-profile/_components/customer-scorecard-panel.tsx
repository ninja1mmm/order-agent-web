"use client";

import { Info, Radar } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar as RadarShape,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  getCustomerProfileScorecard,
  type CustomerScoreMetricKey,
  type CustomerScoreMetricDetail,
  type CustomerScorecardResponse,
} from "@/services/customer-profile";
import {
  formatDisplayDateTime,
  formatPercent,
  SCORE_METRIC_LABELS,
} from "./customer-profile-utils";

type CustomerScorecardPanelProps = {
  customerId: string | null;
};

const METRICS: CustomerScoreMetricKey[] = [
  "accuracyScore",
  "coverageScore",
  "biasHealthScore",
  "convergenceScore",
  "timelinessScore",
];

const FORMULA_TEXT: Record<CustomerScoreMetricKey, string> = {
  coverageScore: "覆盖率 = 有预测记录的发运物料周数量 / 全部发运物料周数量",
  accuracyScore: "准确性 = 100 * (1 - 最后预测与最终发运的绝对误差总和 / 最终发运总量)",
  biasHealthScore: "偏差健康度 = 100 * (1 - |最后预测与最终发运的有方向误差总和 / 最终发运总量|)",
  convergenceScore: "收敛能力 = 最后一次预测比第一次预测更接近最终发运的多版本物料周数量 / 全部多版本物料周数量",
  timelinessScore: "及时性 = 首次预测距离发运周开始的提前天数映射为 0-100 分",
};

export function CustomerScorecardPanel({ customerId }: CustomerScorecardPanelProps) {
  const [data, setData] = useState<CustomerScorecardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeMetric, setActiveMetric] = useState<CustomerScoreMetricKey>("accuracyScore");
  const [selectedSnapshotAt, setSelectedSnapshotAt] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!customerId) {
      return;
    }

    let cancelled = false;
    async function fetchScorecard() {
      setLoading(true);
      try {
        const response = await getCustomerProfileScorecard(customerId, { days: 90 });
        if (cancelled) return;
        setData(response);
        setSelectedSnapshotAt(null);
      } catch {
        if (cancelled) return;
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchScorecard();
    return () => { cancelled = true; };
  }, [customerId]);

  const radarData = METRICS.map((metric) => ({
    metric,
    label: SCORE_METRIC_LABELS[metric],
    score: data?.current[metric] ?? 0,
  }));

  const timelineData = (data?.timeline ?? []).map((point) => ({
    receivedAt: point.receivedAt,
    label: formatDisplayDateTime(point.receivedAt),
    score: point[activeMetric],
    details: point.details,
  }));
  const activeDetail = findMetricDetail(data?.current.details, activeMetric);
  const selectedSnapshot = selectedSnapshotAt
    ? data?.timeline.find((point) => point.receivedAt === selectedSnapshotAt) ?? null
    : null;
  const selectedSnapshotDetail = findMetricDetail(selectedSnapshot?.details, activeMetric);
  const explanationItems = data?.explanations.length
    ? data.explanations
    : METRICS.map((metric) => ({
      key: metric,
      label: SCORE_METRIC_LABELS[metric],
      description: "该维度用于从客户整体层面评价预测与发运的匹配质量。",
      formula: FORMULA_TEXT[metric],
    }));

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">
          <Radar className="h-4 w-4" aria-hidden="true" />
          客户五维评价
        </h2>
        <Button
          aria-label="查看计算说明"
          title="查看计算说明"
          size="icon-sm"
          onClick={() => setShowHelp((current) => !current)}
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
        {showHelp ? (
          <div className="scorecard-popover" role="dialog" aria-label="客户评分计算说明">
            <div className="scorecard-popover-head">
              <strong>客户评分计算说明</strong>
              <span>所有得分归一化为 0-100，样本不足显示为空。</span>
            </div>
            <div className="scorecard-popover-list">
              {explanationItems.map((item) => (
                <div key={item.key}>
                  <p>{item.label}</p>
                  <span>{item.description}</span>
                  <span>{FORMULA_TEXT[item.key as CustomerScoreMetricKey] ?? item.formula}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="panel-body stack scorecard-body">
        {!customerId ? (
          <p className="item-meta">请选择客户查看客户画像评分</p>
        ) : loading ? (
          <p className="item-meta">加载客户评分...</p>
        ) : !data ? (
          <p className="item-meta">暂无客户评分数据</p>
        ) : (
          <>
            <div className="card scorecard-radar-card">
              <ResponsiveContainer width="100%" height={155}>
                <RadarChart data={radarData} outerRadius="68%">
                  <PolarGrid stroke="rgba(148, 163, 184, 0.35)" />
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <RadarShape
                    name="Score"
                    dataKey="score"
                    stroke="#5b6cff"
                    fill="#5b6cff"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                  <Tooltip formatter={(value) => [formatPercent(Number(value)), "得分"]} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="scorecard-metric-grid">
                {METRICS.map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    className={`scorecard-mini-metric${activeMetric === metric ? " selected" : ""}`}
                    onClick={() => setActiveMetric(metric)}
                  >
                    <span>{SCORE_METRIC_LABELS[metric]}</span>
                    <strong>{formatPercent(data.current[metric])}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="card scorecard-trend-card">
              <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
                <p className="mini-title" style={{ marginBottom: 0 }}>指标时间趋势</p>
                <span className="badge slate">{SCORE_METRIC_LABELS[activeMetric]} · 近 {data.days} 天</span>
              </div>

              {timelineData.length === 0 ? (
                <p className="item-meta">暂无邮件时间趋势</p>
              ) : (
                <div className="chart customer-profile-chart scorecard-timeline-chart">
                  <ResponsiveContainer width="100%" height={108}>
                    <LineChart data={timelineData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                      <XAxis dataKey="label" hide />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(label, payload) => {
                          const point = payload[0]?.payload as { receivedAt?: string } | undefined;
                          return point?.receivedAt ? formatDisplayDateTime(point.receivedAt) : String(label);
                        }}
                        formatter={(value) => [formatPercent(value == null ? null : Number(value)), SCORE_METRIC_LABELS[activeMetric]]}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#5b6cff"
                        strokeWidth={2}
                        connectNulls={false}
                        dot={(props) => {
                          const payload = props.payload as { receivedAt?: string } | undefined;
                          return (
                            <circle
                              key={`${props.cx}-${props.cy}`}
                              cx={props.cx}
                              cy={props.cy}
                              r={4}
                              className="scorecard-chart-dot"
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                if (payload?.receivedAt) setSelectedSnapshotAt(payload.receivedAt);
                              }}
                              onKeyDown={(event) => {
                                if ((event.key === "Enter" || event.key === " ") && payload?.receivedAt) {
                                  setSelectedSnapshotAt(payload.receivedAt);
                                }
                              }}
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <MetricDetailTable
                detail={selectedSnapshotDetail ?? activeDetail}
                title={selectedSnapshot ? `${formatDisplayDateTime(selectedSnapshot.receivedAt)} 快照` : "当前快照"}
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function findMetricDetail(
  details: CustomerScoreMetricDetail[] | undefined,
  metric: CustomerScoreMetricKey,
): CustomerScoreMetricDetail | null {
  return details?.find((item) => item.key === metric) ?? null;
}

function formatMetricNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function biasDirectionLabel(direction: CustomerScoreMetricDetail["biasDirection"]): string {
  if (direction === "over") return "偏高报";
  if (direction === "under") return "偏低报";
  if (direction === "balanced") return "基本平衡";
  return "-";
}

function MetricDetailTable({
  detail,
  title,
}: {
  detail: CustomerScoreMetricDetail | null;
  title: string;
}) {
  if (!detail) {
    return <p className="item-meta">暂无计算明细</p>;
  }

  return (
    <div className="scorecard-detail-table-card">
      <div className="row" style={{ alignItems: "center", marginBottom: 6 }}>
        <p className="mini-title" style={{ marginBottom: 0 }}>{title}</p>
        <span className="badge slate">{detail.label} {formatPercent(detail.score)}</span>
      </div>
      <table className="scorecard-detail-table">
        <thead>
          <tr>
            <th>变量</th>
            <th>说明</th>
            <th>值</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A</td>
            <td>{detail.numeratorLabel}</td>
            <td>{formatMetricNumber(detail.numerator)}</td>
          </tr>
          <tr>
            <td>B</td>
            <td>{detail.denominatorLabel}</td>
            <td>{formatMetricNumber(detail.denominator)}</td>
          </tr>
          {detail.key === "biasHealthScore" ? (
            <>
              <tr>
                <td>Bias</td>
                <td>A / B，有方向偏差率</td>
                <td>{detail.biasRate == null ? "-" : `${detail.biasRate > 0 ? "+" : ""}${formatPercent(detail.biasRate)}`}</td>
              </tr>
              <tr>
                <td>方向</td>
                <td>偏高 / 偏低判断</td>
                <td>{biasDirectionLabel(detail.biasDirection)}</td>
              </tr>
            </>
          ) : null}
          <tr>
            <td>公式</td>
            <td>{metricFormula(detail)}</td>
            <td>{formatPercent(detail.score)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function metricFormula(detail: CustomerScoreMetricDetail): string {
  switch (detail.key) {
    case "accuracyScore":
      return "得分 = 100 * (1 - A / B)";
    case "biasHealthScore":
      return "得分 = 100 * (1 - |A / B|)";
    case "timelinessScore":
      return "得分 = A / B";
    default:
      return "得分 = 100 * A / B";
  }
}
