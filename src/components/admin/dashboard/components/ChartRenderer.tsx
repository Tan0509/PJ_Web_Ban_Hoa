'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { ChartType, DashboardDataPoint, MetricKey } from '../types/dashboard';
import {
  CHART_TYPE_LABELS,
  DATE_LEGEND_PALETTE,
  formatDateDisplay,
  formatMonthDisplay,
  formatRevenueAxis,
  getRevenueUnitsInData,
  METRIC_LABELS,
  METRIC_TITLE_LABELS,
  REVENUE_UNIT_LABELS,
} from '../utils/chartConfig';

type FilterType = 'day' | 'month' | 'year' | 'hour';

type ChartRendererProps = {
  chartType: ChartType;
  selectedMetrics: MetricKey[];
  colors: Record<MetricKey, string>;
  data: DashboardDataPoint[];
  dateRange: { from: string; to: string };
  filterType?: FilterType;
  hourRange?: { from: number; to: number };
};

function buildChartTitle(
  chartType: ChartType,
  selectedMetrics: MetricKey[],
  dateRange: { from: string; to: string },
  filterType: FilterType = 'day'
): string {
  const chartLabel = CHART_TYPE_LABELS[chartType];
  const metricParts = selectedMetrics.map((m) => METRIC_TITLE_LABELS[m]);
  const metricText = metricParts.length === 1 ? metricParts[0] : metricParts.join(', ');
  if (filterType === 'hour') {
    const dayStr = formatDateDisplay(dateRange.from);
    return `${chartLabel} thể hiện ${metricText} của ngày ${dayStr}`;
  }
  if (filterType === 'month') {
    const fromStr = formatMonthDisplay(dateRange.from);
    const toStr = formatMonthDisplay(dateRange.to);
    return `${chartLabel} thể hiện ${metricText} theo tháng từ ${fromStr} - ${toStr}`;
  }
  if (filterType === 'year') {
    const fromStr = dateRange.from.slice(0, 4);
    const toStr = dateRange.to.slice(0, 4);
    return `${chartLabel} thể hiện ${metricText} theo năm từ ${fromStr} - ${toStr}`;
  }
  const fromStr = formatDateDisplay(dateRange.from);
  const toStr = formatDateDisplay(dateRange.to);
  return `${chartLabel} thể hiện ${metricText} từ ngày ${fromStr} - ${toStr}`;
}

function formatTooltipValue(value: unknown, metric: MetricKey): string | number {
  if (typeof value !== 'number') return String(value ?? '');
  if (metric === 'revenue') return formatRevenueAxis(value);
  return new Intl.NumberFormat('vi-VN').format(value);
}

function parseHourFromDateLabel(label: string): number {
  const parts = label.split('-');
  return parts.length >= 4 ? parseInt(parts[3], 10) : 0;
}

export default function ChartRenderer({ chartType, selectedMetrics, colors, data, dateRange, filterType = 'day', hourRange }: ChartRendererProps) {
  const displayData =
    filterType === 'hour' && hourRange
      ? data.filter((d) => {
          const h = parseHourFromDateLabel(d.date);
          return h >= hourRange.from && h <= hourRange.to;
        })
      : data;

  if (!displayData.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50">
        Không có dữ liệu.
      </div>
    );
  }

  if (selectedMetrics.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50">
        Vui lòng chọn ít nhất một dữ liệu.
      </div>
    );
  }

  if (chartType === 'pie') {
    const metric = selectedMetrics[0];
    const pieData = displayData.map((item) => ({
      name: item.date,
      value: item[metric],
    }));
    const chartTitle = buildChartTitle(chartType, selectedMetrics, dateRange, filterType);
    const titleColor = colors[metric];
    const isRevenue = metric === 'revenue';
    const unitsInDataPie = getRevenueUnitsInData(displayData, metric);
    const footnotePartsPie: string[] = [];
    if (unitsInDataPie.K) footnotePartsPie.push(`K: ${REVENUE_UNIT_LABELS.K}`);
    if (unitsInDataPie.M) footnotePartsPie.push(`M: ${REVENUE_UNIT_LABELS.M}`);
    if (unitsInDataPie.B) footnotePartsPie.push(`B: ${REVENUE_UNIT_LABELS.B}`);
    const footnotePie = isRevenue && footnotePartsPie.length > 0 ? footnotePartsPie.join(', ') : null;
    const tooltipFormatterPie = (value: unknown) => formatTooltipValue(value, metric);

    return (
      <>
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={2}
            >
              {pieData.map((entry, idx) => (
                <Cell key={entry.name} fill={DATE_LEGEND_PALETTE[idx % DATE_LEGEND_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipFormatterPie} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-3 text-center">
          <p className="text-xl font-medium" style={{ color: titleColor }}>{chartTitle}</p>
          {footnotePie && <p className="mt-1 text-xs text-gray-500">{footnotePie}</p>}
        </div>
      </>
    );
  }

  const series = selectedMetrics.map((metric) => ({
    metric,
    color: colors[metric],
    label: METRIC_LABELS[metric],
  }));

  const chartTitle = buildChartTitle(chartType, selectedMetrics, dateRange, filterType);
  const metric = selectedMetrics[0];
  const titleColor = colors[metric];
  const isRevenue = metric === 'revenue';
  const yAxisTickFormatter = isRevenue
    ? (v: number) => formatRevenueAxis(v)
    : (v: number) => new Intl.NumberFormat('vi-VN').format(v);
  const tooltipFormatter = (value: unknown) => formatTooltipValue(value, metric);
  const unitsInData = getRevenueUnitsInData(displayData, metric);
  const footnoteParts: string[] = [];
  if (unitsInData.K) footnoteParts.push(`K: ${REVENUE_UNIT_LABELS.K}`);
  if (unitsInData.M) footnoteParts.push(`M: ${REVENUE_UNIT_LABELS.M}`);
  if (unitsInData.B) footnoteParts.push(`B: ${REVENUE_UNIT_LABELS.B}`);
  const footnote = isRevenue && footnoteParts.length > 0 ? footnoteParts.join(', ') : null;

  const xAxisTickFormatter = filterType === 'hour' ? (value: string) => `${parseHourFromDateLabel(value)}h` : undefined;

  if (chartType === 'line') {
    return (
      <>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={displayData} margin={{ left: 10, top: 24, right: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={xAxisTickFormatter} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={yAxisTickFormatter} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            {series.map((s) => (
              <Line
                key={s.metric}
                type="monotone"
                dataKey={s.metric}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 text-center">
          <p className="text-xl font-medium" style={{ color: titleColor }}>{chartTitle}</p>
          {footnote && <p className="mt-1 text-xs text-gray-500">{footnote}</p>}
        </div>
      </>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={displayData} margin={{ left: 10, top: 24, right: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={xAxisTickFormatter} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={yAxisTickFormatter} />
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
          {series.map((s) => (
            <Bar
              key={s.metric}
              dataKey={s.metric}
              name={s.label}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            >
              {displayData.map((_, idx) => (
                <Cell key={idx} fill={DATE_LEGEND_PALETTE[idx % DATE_LEGEND_PALETTE.length]} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 text-center">
        <p className="text-xl font-medium" style={{ color: titleColor }}>{chartTitle}</p>
        {footnote && <p className="mt-1 text-xs text-gray-500">{footnote}</p>}
      </div>
    </>
  );
}
