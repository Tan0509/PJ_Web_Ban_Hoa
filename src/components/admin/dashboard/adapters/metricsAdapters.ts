'use client';

import { ChartMetric } from '../../chart-system/types';

type ApiMetricResponse = {
  metric: 'users' | 'visits';
  unit: 'users' | 'visits';
  groupBy: 'day' | 'month';
  from: string;
  to: string;
  data: { label: string; value: number }[];
};

// This adapter maps API data to ChartMetric
export function mapUsersApiToChartMetric(resp: ApiMetricResponse): ChartMetric {
  return {
    title: 'Người dùng mới',
    metricType: 'time_series',
    unit: resp.unit,
    data: resp.data ?? [],
  };
}

export function mapVisitsApiToChartMetric(resp: ApiMetricResponse): ChartMetric {
  return {
    title: 'Lượt truy cập',
    metricType: 'time_series',
    unit: resp.unit,
    data: resp.data ?? [],
  };
}
