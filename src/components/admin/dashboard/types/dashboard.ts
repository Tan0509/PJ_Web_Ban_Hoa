'use client';

export type ChartType = 'line' | 'bar' | 'pie';
export type MetricKey = 'revenue' | 'orders' | 'users';

export interface DashboardDataPoint {
  date: string; // ISO yyyy-mm-dd
  revenue: number;
  orders: number;
  users: number;
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
