'use client';

import { ChartType, MetricKey } from '../types/dashboard';

export const DEFAULT_COLORS: Record<MetricKey, string> = {
  revenue: '#0ea5e9',   // sky-500 – xanh dương nổi bật
  orders: '#10b981',   // emerald-500 – xanh lá rõ ràng
  users: '#ec4899',    // pink-500 – hồng/magenta dễ phân biệt
};

export const METRIC_LABELS: Record<MetricKey, string> = {
  revenue: 'Doanh thu',
  orders: 'Đơn hàng',
  users: 'Người dùng mới',
};

/** Nhãn loại biểu đồ cho tiêu đề động */
export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  line: 'Biểu đồ đường',
  bar: 'Biểu đồ cột',
  pie: 'Biểu đồ tròn',
};

/** Tên metric dùng trong tiêu đề (số lượng ...) */
export const METRIC_TITLE_LABELS: Record<MetricKey, string> = {
  revenue: 'số lượng doanh thu',
  orders: 'số lượng đơn hàng',
  users: 'số lượng người dùng mới',
};

/** Format ngày yyyy-mm-dd → dd/MM/yyyy */
export function formatDateDisplay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return d && m && y ? `${d}/${m}/${y}` : isoDate;
}

/** Format tháng yyyy-mm-dd → MM/yyyy */
export function formatMonthDisplay(isoDate: string): string {
  const [y, m] = isoDate.split('-');
  return m && y ? `${m}/${y}` : isoDate;
}

/** Bảng màu cho legend theo ngày (mỗi ngày một màu khác nhau) */
export const DATE_LEGEND_PALETTE = [
  '#0ea5e9', '#10b981', '#ec4899', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f43f5e', '#6366f1', '#14b8a6',
  '#eab308', '#d946ef', '#0d9488', '#a855f7',
];

export type DatePresetKey = 7 | 30 | 'month' | 'year';

export const DATE_PRESETS: { label: string; value: DatePresetKey }[] = [
  { label: '7 ngày gần nhất', value: 7 },
  { label: '30 ngày gần nhất', value: 30 },
  { label: 'Tháng', value: 'month' },
  { label: 'Năm', value: 'year' },
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

/** Format tiền cho trục/tooltip Doanh thu: K (trăm nghìn), M (triệu), B (tỷ) */
export function formatRevenueAxis(value: number): string {
  if (value >= 1e9) {
    const n = value / 1e9;
    return `${n % 1 === 0 ? n : n.toFixed(1)}B`;
  }
  if (value >= 1e6) {
    const n = value / 1e6;
    return `${n % 1 === 0 ? n : n.toFixed(1)}M`;
  }
  if (value >= 1e3) {
    const n = value / 1e3;
    return `${n % 1 === 0 ? n : n.toFixed(1)}K`;
  }
  return String(value);
}

/** Đơn vị ghi chú: K / M / B */
export const REVENUE_UNIT_LABELS = { K: 'Trăm Nghìn VND', M: 'Triệu VND', B: 'Tỷ VND' } as const;

/** Xác định đơn vị xuất hiện trong dữ liệu (revenue) */
export function getRevenueUnitsInData(
  data: Array<{ revenue?: number }>,
  metricKey: string
): { K: boolean; M: boolean; B: boolean } {
  if (metricKey !== 'revenue' || !data.length) return { K: false, M: false, B: false };
  const key = 'revenue' as keyof (typeof data)[0];
  let max = 0;
  for (const row of data) {
    const v = Number(row[key]);
    if (typeof v === 'number' && !Number.isNaN(v)) max = Math.max(max, v);
  }
  return {
    K: max >= 1e3,
    M: max >= 1e6,
    B: max >= 1e9,
  };
}
