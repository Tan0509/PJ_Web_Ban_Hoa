'use client';

import { ChartInput, ResolvedChart } from '../types';

export function resolveChartType(input: ChartInput): ResolvedChart {
  const { metricType, data } = input;
  const length = data.length;

  if (metricType === 'single_kpi') {
    return { type: 'kpi', reason: 'metricType=single_kpi' };
  }

  if (metricType === 'distribution') {
    return { type: 'donut', reason: 'metricType=distribution' };
  }

  if (metricType === 'time_series') {
    if (length <= 7) return { type: 'bar', reason: 'time_series <= 7 điểm' };
    return { type: 'line', reason: 'time_series > 7 điểm' };
  }

  if (metricType === 'categorical') {
    if (length <= 6) return { type: 'donut', reason: 'categorical <= 6 nhóm (dùng donut/pie)' };
    return { type: 'bar', reason: 'categorical > 6 nhóm' };
  }

  return { type: 'bar', reason: 'fallback' };
}
