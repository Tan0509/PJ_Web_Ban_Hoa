'use client';

import { useMemo, useState } from 'react';
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

type ChartType = 'pie' | 'bar' | 'line';
type MetricKey = 'revenue' | 'orders' | 'newUsers';

type DashboardSeries = {
  date: string; // ISO yyyy-mm-dd
  revenue: number;
  orders: number;
  newUsers: number;
};

type ColorMode = 'default' | 'custom';

const DEFAULT_COLORS: Record<MetricKey, string> = {
  revenue: '#0ea5e9',   // sky-500 – xanh dương nổi bật
  orders: '#10b981',   // emerald-500 – xanh lá rõ ràng
  newUsers: '#ec4899', // pink-500 – hồng/magenta dễ phân biệt
};

const METRIC_LABELS: Record<MetricKey, string> = {
  revenue: 'Doanh thu',
  orders: 'Số đơn hàng',
  newUsers: 'Người dùng mới',
};

// TODO: Thay mockData bằng API thật khi backend thống kê sẵn sàng.
function generateMockData(): DashboardSeries[] {
  const days = 60;
  const today = new Date();
  const data: DashboardSeries[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    data.push({
      date,
      revenue: 800000 + Math.floor(Math.random() * 1200000),
      orders: 5 + Math.floor(Math.random() * 25),
      newUsers: 1 + Math.floor(Math.random() * 10),
    });
  }
  return data;
}

const mockData = generateMockData();

function getLastNDaysRange(n: number): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (n - 1));
  return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
}

function validateDateRange(from: string, to: string) {
  if (!from || !to) return false;
  return new Date(from) <= new Date(to);
}

type MetricColorState = Record<MetricKey, { mode: ColorMode; color: string }>;

export default function DashboardChart() {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    'revenue',
    'orders',
    'newUsers',
  ]);
  const [colorState, setColorState] = useState<MetricColorState>({
    revenue: { mode: 'default', color: DEFAULT_COLORS.revenue },
    orders: { mode: 'default', color: DEFAULT_COLORS.orders },
    newUsers: { mode: 'default', color: DEFAULT_COLORS.newUsers },
  });
  const defaultRange = getLastNDaysRange(30);
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  const isDateRangeValid = validateDateRange(fromDate, toDate);

  const filteredData = useMemo(() => {
    const from = isDateRangeValid ? fromDate : defaultRange.from;
    const to = isDateRangeValid ? toDate : defaultRange.to;
    return mockData.filter((item) => item.date >= from && item.date <= to);
  }, [fromDate, toDate, isDateRangeValid, defaultRange.from, defaultRange.to]);

  const pieData = useMemo(() => {
    const sumByMetric: Record<MetricKey, number> = {
      revenue: 0,
      orders: 0,
      newUsers: 0,
    };
    filteredData.forEach((row) => {
      sumByMetric.revenue += row.revenue;
      sumByMetric.orders += row.orders;
      sumByMetric.newUsers += row.newUsers;
    });
    return selectedMetrics.map((key) => ({
      name: METRIC_LABELS[key],
      value: sumByMetric[key],
      color: colorState[key].mode === 'custom' ? colorState[key].color : DEFAULT_COLORS[key],
    }));
  }, [filteredData, selectedMetrics, colorState]);

  const handleMetricToggle = (metric: MetricKey) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const handleColorModeChange = (metric: MetricKey, mode: ColorMode) => {
    setColorState((prev) => ({
      ...prev,
      [metric]: { ...prev[metric], mode },
    }));
  };

  const handleColorChange = (metric: MetricKey, color: string) => {
    setColorState((prev) => ({
      ...prev,
      [metric]: { ...prev[metric], color },
    }));
  };

  const anyMetric = selectedMetrics.length > 0;

  const chartContent = () => {
    if (!anyMetric) {
      return (
        <div className="flex h-64 items-center justify-center text-sm text-gray-500">
          Chọn ít nhất một dữ liệu để hiển thị biểu đồ.
        </div>
      );
    }

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={4}
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    const series = selectedMetrics.map((metric) => {
      const color =
        colorState[metric].mode === 'custom' ? colorState[metric].color : DEFAULT_COLORS[metric];
      return { metric, color };
    });

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={filteredData} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {series.map((s) => (
              <Line
                key={s.metric}
                type="monotone"
                dataKey={s.metric}
                name={METRIC_LABELS[s.metric]}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={filteredData} margin={{ left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {series.map((s) => (
            <Bar
              key={s.metric}
              dataKey={s.metric}
              name={METRIC_LABELS[s.metric]}
              fill={s.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Loại biểu đồ</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="bar">Biểu đồ cột</option>
              <option value="line">Biểu đồ đường</option>
              <option value="pie">Biểu đồ tròn</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
            />
          </div>
          {!isDateRangeValid && (
            <div className="text-xs text-red-600">Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.</div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs text-gray-500">Chọn dữ liệu hiển thị</div>
          <div className="flex flex-wrap gap-3">
            {(['revenue', 'orders', 'newUsers'] as MetricKey[]).map((metric) => {
              const checked = selectedMetrics.includes(metric);
              const colorMode = colorState[metric].mode;
              const color = colorState[metric].color;
              return (
                <div
                  key={metric}
                  className="border border-gray-200 rounded-md px-3 py-2 flex flex-col gap-2 min-w-[220px]"
                >
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleMetricToggle(metric)}
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
                        onChange={() => handleColorModeChange(metric, 'default')}
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
                        onChange={() => handleColorModeChange(metric, 'custom')}
                        className="accent-emerald-600"
                      />
                      Tùy chọn
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => handleColorChange(metric, e.target.value)}
                        disabled={colorMode !== 'custom'}
                        className="h-6 w-10 border border-gray-200 rounded cursor-pointer disabled:opacity-50"
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

      <div>{chartContent()}</div>
    </div>
  );
}
