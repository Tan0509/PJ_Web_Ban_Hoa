'use client';

import { ChartType, DateRange, MetricColorState, MetricKey } from '../types/dashboard';
import { DATE_PRESETS, DatePresetKey, DEFAULT_COLORS, METRIC_LABELS } from '../utils/chartConfig';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: `Tháng ${i + 1}` }));
const YEAR_START = 2020;
const YEAR_END = new Date().getFullYear() + 1;
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);

type ChartControlsProps = {
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  selectedMetrics: MetricKey[];
  onMetricSelect: (metric: MetricKey) => void;
  colors: MetricColorState;
  onColorModeChange: (metric: MetricKey, mode: 'default' | 'custom') => void;
  onColorChange: (metric: MetricKey, color: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange, options?: { clearPreset?: boolean }) => void;
  activePreset: DatePresetKey | null;
  onPresetClick: (preset: DatePresetKey) => void;
};

const metricList: MetricKey[] = ['revenue', 'orders', 'users'];

function lastDayOfMonth(year: number, monthOneBased: number): string {
  const d = new Date(year, monthOneBased, 0); // month 1-12, day 0 = last day of prev month
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ChartControls({
  chartType,
  onChartTypeChange,
  selectedMetrics,
  onMetricSelect,
  colors,
  onColorModeChange,
  onColorChange,
  dateRange,
  onDateRangeChange,
  activePreset,
  onPresetClick,
}: ChartControlsProps) {
  const isValidRange = new Date(dateRange.from) <= new Date(dateRange.to);

  const fromMonth = dateRange.from.slice(5, 7);
  const fromYear = dateRange.from.slice(0, 4);
  const toMonth = dateRange.to.slice(5, 7);
  const toYear = dateRange.to.slice(0, 4);

  const handleMonthFromChange = (month: string, year: string) => {
    const from = `${year}-${month}-01`;
    const to = lastDayOfMonth(Number(toYear), Number(toMonth));
    onDateRangeChange({ from, to }, { clearPreset: false });
  };
  const handleMonthToChange = (month: string, year: string) => {
    const from = dateRange.from;
    const to = lastDayOfMonth(Number(year), Number(month));
    onDateRangeChange({ from, to }, { clearPreset: false });
  };
  const handleYearFromChange = (year: string) => {
    onDateRangeChange({ from: `${year}-01-01`, to: dateRange.to }, { clearPreset: false });
  };
  const handleYearToChange = (year: string) => {
    onDateRangeChange({ from: dateRange.from, to: `${year}-12-31` }, { clearPreset: false });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
      <div className="grid gap-3 md:grid-cols-3 items-end">
        <div className="flex flex-col gap-1 md:col-span-1">
          <label className="text-xs text-gray-500">Loại chart</label>
          <select
            value={chartType}
            onChange={(e) => onChartTypeChange(e.target.value as ChartType)}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          >
            <option value="line">Line chart (Biểu đồ đường)</option>
            <option value="bar">Bar chart (Biểu đồ cột)</option>
            <option value="pie">Pie chart (Biểu đồ tròn)</option>
          </select>
        </div>
        {activePreset === 'month' ? (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Từ tháng</label>
              <div className="flex gap-2">
                <select
                  value={fromMonth}
                  onChange={(e) => handleMonthFromChange(e.target.value, fromYear)}
                  className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white flex-1"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={fromYear}
                  onChange={(e) => handleMonthFromChange(fromMonth, e.target.value)}
                  className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white flex-1"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Đến tháng</label>
              <div className="flex gap-2">
                <select
                  value={toMonth}
                  onChange={(e) => handleMonthToChange(e.target.value, toYear)}
                  className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white flex-1"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={toYear}
                  onChange={(e) => handleMonthToChange(toMonth, e.target.value)}
                  className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white flex-1"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : activePreset === 'year' ? (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Từ năm</label>
              <select
                value={fromYear}
                onChange={(e) => handleYearFromChange(e.target.value)}
                className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Đến năm</label>
              <select
                value={toYear}
                onChange={(e) => handleYearToChange(e.target.value)}
                className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Từ ngày</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
                className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Đến ngày</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
                className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((preset) => {
          const isActive = activePreset === preset.value;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onPresetClick(preset.value)}
              className={`px-3 h-11 text-xs border rounded-md transition ${
                isActive
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-emerald-500'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {!isValidRange && (
        <div className="text-xs text-red-600">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</div>
      )}

      <div className="flex flex-col gap-2">
        <div className="text-xs text-gray-500">Dữ liệu hiển thị</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {metricList.map((metric) => {
            const checked = selectedMetrics.includes(metric);
            const colorMode = colors[metric].mode;
            const color = colors[metric].color || DEFAULT_COLORS[metric];
            return (
              <div
                key={metric}
                className="border border-gray-200 rounded-md px-3 py-3 flex flex-col gap-2 min-h-[120px] bg-white"
              >
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="display-metric"
                    value={metric}
                    checked={checked}
                    onChange={() => onMetricSelect(metric)}
                    className="accent-emerald-600"
                  />
                  <span>{METRIC_LABELS[metric]}</span>
                </label>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`${metric}-color-mode`}
                      value="default"
                      checked={colorMode === 'default'}
                      onChange={() => onColorModeChange(metric, 'default')}
                      className="accent-emerald-600"
                    />
                    Mặc định
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`${metric}-color-mode`}
                      value="custom"
                      checked={colorMode === 'custom'}
                      onChange={() => onColorModeChange(metric, 'custom')}
                      className="accent-emerald-600"
                    />
                    Tùy chọn
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => onColorChange(metric, e.target.value)}
                      disabled={colorMode !== 'custom'}
                      className="h-7 w-10 border border-gray-200 rounded cursor-pointer disabled:opacity-50"
                      aria-label={`Chọn màu cho ${METRIC_LABELS[metric]}`}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
