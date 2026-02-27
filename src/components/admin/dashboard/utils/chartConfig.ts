'use client';

import { ChartType, MetricKey } from '../types/dashboard';

export const DEFAULT_COLORS: Record<MetricKey, string> = {
  users: '#ec4899',   // pink-500
  visits: '#0ea5e9',  // sky-500
};

export const METRIC_LABELS: Record<MetricKey, string> = {
  users: 'Người dùng mới',
  visits: 'Lượt truy cập',
};

/** Nhãn loại biểu đồ cho tiêu đề động */
export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  line: 'Biểu đồ đường',
  bar: 'Biểu đồ cột',
  pie: 'Biểu đồ tròn',
};

/** Tên metric dùng trong tiêu đề (số lượng ...) */
export const METRIC_TITLE_LABELS: Record<MetricKey, string> = {
  users: 'số lượng người dùng mới',
  visits: 'số lượt truy cập',
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

export function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}
