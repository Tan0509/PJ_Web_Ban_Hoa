'use client';

export type ChartType = 'line' | 'bar' | 'pie';
export type MetricKey = 'users' | 'visits';

export interface DashboardDataPoint {
  date: string; // ISO yyyy-mm-dd
  users: number;
  visits: number;
}

export interface MetricColorConfig {
  mode: 'default' | 'custom';
  color: string;
}

export type MetricColorState = Record<MetricKey, MetricColorConfig>;

export interface DateRange {
  from: string;
  to: string;
}
