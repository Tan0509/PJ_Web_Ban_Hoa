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
    const usersBase = 3 + Math.floor(Math.random() * 15);
    const visitsBase = 20 + Math.floor(Math.random() * 120);

    data.push({
      date,
      users: usersBase,
      visits: visitsBase,
    });
  }

  return data;
}

export const mockDashboardData: DashboardDataPoint[] = generateMockDashboardData();
