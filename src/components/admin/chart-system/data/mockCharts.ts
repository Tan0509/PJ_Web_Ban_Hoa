'use client';

import { ChartInput } from '../types';

// TODO: Replace mock data with real API
export const mockRevenueByDay: ChartInput = {
  title: 'Doanh thu theo ngày',
  metricType: 'time_series',
  unit: 'VND',
  data: [
    { label: '05/01', value: 1450000 },
    { label: '06/01', value: 1820000 },
    { label: '07/01', value: 1320000 },
    { label: '08/01', value: 2100000 },
    { label: '09/01', value: 1980000 },
    { label: '10/01', value: 2250000 },
    { label: '11/01', value: 2050000 },
    { label: '12/01', value: 1890000 },
    { label: '13/01', value: 2400000 },
    { label: '14/01', value: 2650000 },
  ],
};

// TODO: Replace mock data with real API
export const mockOrdersByStatus: ChartInput = {
  title: 'Đơn hàng theo trạng thái',
  metricType: 'categorical',
  unit: 'orders',
  data: [
    { label: 'Pending', value: 24 },
    { label: 'Paid', value: 42 },
    { label: 'Shipped', value: 31 },
    { label: 'Cancelled', value: 6 },
    { label: 'Refunded', value: 3 },
  ],
};

// TODO: Replace mock data with real API
export const mockKpiRevenue: ChartInput = {
  title: 'Tổng doanh thu',
  metricType: 'single_kpi',
  unit: 'VND',
  data: [{ label: 'Tổng', value: 125_500_000 }],
};
