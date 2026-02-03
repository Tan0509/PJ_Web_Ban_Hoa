'use client';

import { ChartMetric } from '../../chart-system/types';

type ApiMetricResponse = {
  metric: 'revenue' | 'orders' | 'users';
  unit: 'VND' | 'orders' | 'users';
  groupBy: 'day' | 'month';
  from: string;
  to: string;
  data: { label: string; value: number }[];
};

// This adapter maps API data to ChartMetric
export function mapRevenueApiToChartMetric(resp: ApiMetricResponse): ChartMetric {
  return {
    title: 'Doanh thu theo ngày',
    metricType: 'time_series',
    unit: resp.unit,
    data: resp.data ?? [],
  };
}

// This adapter maps API data to ChartMetric
export function mapOrdersApiToChartMetric(resp: ApiMetricResponse): ChartMetric {
  return {
    title: 'Đơn hàng theo ngày',
    metricType: 'time_series',
    unit: resp.unit,
    data: resp.data ?? [],
  };
}

// This adapter maps API data to ChartMetric
export function mapUsersApiToChartMetric(resp: ApiMetricResponse): ChartMetric {
  return {
    title: 'Người dùng mới',
    metricType: 'time_series',
    unit: resp.unit,
    data: resp.data ?? [],
  };
}

// KPI tổng doanh thu (sử dụng cùng API doanh thu, nhưng map thành single_kpi)
export function mapRevenueApiToKpi(resp: ApiMetricResponse): ChartMetric {
  const total = (resp.data ?? []).reduce((sum, item) => sum + (item.value || 0), 0);
  return {
    title: 'Tổng doanh thu',
    metricType: 'single_kpi',
    unit: resp.unit,
    data: [{ label: 'Tổng', value: total }],
  };
}
