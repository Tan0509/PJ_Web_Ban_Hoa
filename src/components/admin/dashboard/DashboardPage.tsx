'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ChartControls from './components/ChartControls';
import ChartRenderer from './components/ChartRenderer';
import SummaryCards from './components/SummaryCards';
import { ChartType, DateRange, MetricColorState, MetricKey } from './types/dashboard';
import { DatePresetKey, DEFAULT_COLORS } from './utils/chartConfig';
import { useBestSellingProduct, useCombinedSeries, useDefaultRange } from './hooks/useMetrics';

const DASHBOARD_FILTER_KEY = 'dashboardFilter';

function getDefaultRange(): DateRange {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  return { from: dateStr, to: dateStr };
}

function parseStoredFilter(): { dateRange: DateRange; activePreset: DatePresetKey | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DASHBOARD_FILTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { activePreset?: DatePresetKey | null; dateRange?: DateRange };
    const from = parsed?.dateRange?.from;
    const to = parsed?.dateRange?.to;
    const preset = parsed?.activePreset;
    if (from && to && from <= to) {
      const dateRange: DateRange = { from, to };
      const activePreset =
        preset === 7 || preset === 30 || preset === 'month' || preset === 'year' ? preset : null;
      return { dateRange, activePreset };
    }
    return null;
  } catch {
    return null;
  }
}

function getInitialFilter(): { dateRange: DateRange; activePreset: DatePresetKey | null } {
  const stored = parseStoredFilter();
  if (stored) {
    if (stored.activePreset !== null) {
      return { dateRange: getRangeForPreset(stored.activePreset), activePreset: stored.activePreset };
    }
    return { dateRange: stored.dateRange, activePreset: null };
  }
  return { dateRange: getDefaultRange(), activePreset: null };
}

function getRangeForPreset(preset: DatePresetKey): DateRange {
  const today = new Date();
  if (preset === 7) {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }
  if (preset === 30) {
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }
  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }
  // year
  const y = today.getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export default function DashboardPage() {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['revenue']);
  const [colors, setColors] = useState<MetricColorState>({
    revenue: { mode: 'default', color: DEFAULT_COLORS.revenue },
    orders: { mode: 'default', color: DEFAULT_COLORS.orders },
    users: { mode: 'default', color: DEFAULT_COLORS.users },
  });
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange);
  const [activePreset, setActivePreset] = useState<DatePresetKey | null>(null);
  const [hourFrom, setHourFrom] = useState(0);
  const [hourTo, setHourTo] = useState(23);
  const defaultRange = useDefaultRange();

  useEffect(() => {
    const stored = parseStoredFilter();
    if (stored) {
      if (stored.activePreset !== null) {
        setDateRange(getRangeForPreset(stored.activePreset));
        setActivePreset(stored.activePreset);
      } else {
        setDateRange(stored.dateRange);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      DASHBOARD_FILTER_KEY,
      JSON.stringify({ activePreset, dateRange })
    );
  }, [activePreset, dateRange]);

  const validRange = useMemo(() => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      const fallback = { ...defaultRange, groupBy: (activePreset === 'month' ? 'month' : activePreset === 'year' ? 'year' : dateRange.from === dateRange.to ? 'hour' : 'day') as 'day' | 'month' | 'year' | 'hour' };
      return fallback;
    }
    const isSingleDay = dateRange.from === dateRange.to;
    const groupBy: 'day' | 'month' | 'year' | 'hour' = activePreset === 'month' ? 'month' : activePreset === 'year' ? 'year' : isSingleDay ? 'hour' : 'day';
    return { from: dateRange.from, to: dateRange.to, groupBy };
  }, [dateRange.from, dateRange.to, defaultRange, activePreset]);

  const isSingleDayMode = validRange.from === validRange.to && validRange.groupBy === 'hour';

  const handlePresetClick = useCallback((preset: DatePresetKey) => {
    if (activePreset === preset) {
      setActivePreset(null);
      setDateRange(getDefaultRange());
      return;
    }
    setActivePreset(preset);
    setDateRange(getRangeForPreset(preset));
  }, [activePreset]);

  const handleDateRangeChange = useCallback((range: DateRange, options?: { clearPreset?: boolean }) => {
    setDateRange(range);
    if (options?.clearPreset !== false) setActivePreset(null);
  }, []);

  const { data: combinedSeries, loading: seriesLoading, error: seriesError } = useCombinedSeries(validRange);
  const filteredData = combinedSeries || [];
  const { formatted: bestSeller, productName, categoryName, orderCount, totalOrders } = useBestSellingProduct({ from: validRange.from, to: validRange.to });

  const appliedColors = useMemo(
    () =>
      (['revenue', 'orders', 'users'] as MetricKey[]).reduce((acc, key) => {
        const cfg = colors[key];
        acc[key] = cfg.mode === 'custom' ? cfg.color : DEFAULT_COLORS[key];
        return acc;
      }, {} as Record<MetricKey, string>),
    [colors]
  );

  const handleMetricSelect = (metric: MetricKey) => {
    setSelectedMetrics([metric]);
  };

  return (
    <div className="space-y-6">
      <SummaryCards
        data={filteredData}
        bestSeller={bestSeller}
        bestSellerInfo={{ productName, categoryName, orderCount, totalOrders }}
        colors={appliedColors}
      />

      <ChartControls
        chartType={chartType}
        onChartTypeChange={setChartType}
        selectedMetrics={selectedMetrics}
        onMetricSelect={handleMetricSelect}
        colors={colors}
        onColorModeChange={(metric, mode) =>
          setColors((prev) => ({ ...prev, [metric]: { ...prev[metric], mode } }))
        }
        onColorChange={(metric, color) =>
          setColors((prev) => ({ ...prev, [metric]: { ...prev[metric], color } }))
        }
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        activePreset={activePreset}
        onPresetClick={handlePresetClick}
      />

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Phân tích</h2>
            <p className="text-sm text-gray-500">Biểu đồ cập nhật tức thì theo bộ lọc của bạn.</p>
          </div>
          {isSingleDayMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Khoảng giờ:</span>
              <select
                value={hourFrom}
                onChange={(e) => setHourFrom(Number(e.target.value))}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i}h</option>
                ))}
              </select>
              <span className="text-gray-400">–</span>
              <select
                value={hourTo}
                onChange={(e) => setHourTo(Number(e.target.value))}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i}h</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {seriesLoading ? (
          <div className="h-80 rounded-lg border border-dashed border-gray-200 bg-gray-50 animate-pulse" />
        ) : seriesError ? (
          <div className="h-80 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-red-600">
            {seriesError}
          </div>
        ) : (
          <ChartRenderer
            chartType={chartType}
            selectedMetrics={selectedMetrics}
            colors={appliedColors}
            data={filteredData}
            dateRange={validRange}
            filterType={validRange.groupBy}
            hourRange={isSingleDayMode ? { from: hourFrom, to: hourTo } : undefined}
          />
        )}
      </div>
    </div>
  );
}
