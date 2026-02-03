'use client';

import { DashboardDataPoint } from '../types/dashboard';

// TODO: Replace mock data with real API when available.
function generateMockDashboardData(days = 90): DashboardDataPoint[] {
  const today = new Date();
  const data: DashboardDataPoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const revenueBase = 1_000_000 + Math.floor(Math.random() * 1_400_000);
    const ordersBase = 10 + Math.floor(Math.random() * 25);
    const usersBase = 3 + Math.floor(Math.random() * 15);

    data.push({
      date,
      revenue: revenueBase,
      orders: ordersBase,
      users: usersBase,
    });
  }

  return data;
}

export const mockDashboardData: DashboardDataPoint[] = generateMockDashboardData();
