'use client';

export type MetricType = 'time_series' | 'categorical' | 'distribution' | 'single_kpi';

export type UnitType = 'VND' | 'orders' | 'users' | '%' | string;

export type ChartType = 'auto' | 'bar' | 'line' | 'pie' | 'donut' | 'kpi';

export interface ChartDataPoint {
  label: string; // ngày / tháng / category / status
  value: number;
}

export interface TimeRange {
  from: Date;
  to: Date;
}

// ChartMetric là interface chuẩn front-end nhận vào cho Chart System
export interface ChartMetric {
  title: string;
  metricType: MetricType;
  unit?: UnitType;
  data: ChartDataPoint[];
  // Các tùy chọn mở rộng, không bắt buộc
  timeRange?: TimeRange;
  color?: string; // override màu chính cho bar/line
  palette?: string[]; // override màu cho pie/donut
}

export type ChartInput = ChartMetric;

export interface ResolvedChart {
  type: Exclude<ChartType, 'auto'>;
  reason: string;
}
