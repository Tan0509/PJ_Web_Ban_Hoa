'use client';

import { DashboardDataPoint, MetricKey } from '../types/dashboard';
import { formatNumber } from '../utils/chartConfig';

type SummaryCardsProps = {
  data: DashboardDataPoint[];
  visitSummary?: {
    rangeVisits: number;
    activeDays: number;
    totalDays: number;
    todayVisits: number;
  };
  colors?: Record<MetricKey, string>;
};

function calcTotals(data: DashboardDataPoint[]) {
  return data.reduce(
    (acc, item) => {
      acc.users += item.users;
      acc.visits += item.visits;
      return acc;
    },
    { users: 0, visits: 0 }
  );
}

export default function SummaryCards({ data, visitSummary, colors }: SummaryCardsProps) {
  const totals = calcTotals(data);
  const cards: { label: string; value: string; metric: MetricKey | null }[] = [
    { label: 'Người dùng mới', value: formatNumber(totals.users), metric: 'users' },
    {
      label: 'Lượt truy cập (khoảng chọn)',
      value: formatNumber(visitSummary?.rangeVisits ?? totals.visits),
      metric: 'visits',
    },
    {
      label: 'Lượt truy cập hôm nay',
      value: formatNumber(visitSummary?.todayVisits ?? 0),
      metric: null,
    },
    {
      label: 'Ngày có truy cập',
      value: `${visitSummary?.activeDays ?? 0}/${visitSummary?.totalDays ?? 0}`,
      metric: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const bgColor = card.metric && colors?.[card.metric] ? `${colors[card.metric]}18` : undefined;
        return (
          <div
            key={card.label}
            className="rounded-lg p-4 shadow-sm flex flex-col gap-2 border border-gray-200"
            style={bgColor ? { backgroundColor: bgColor } : undefined}
          >
            <div className="text-sm text-gray-500">{card.label}</div>
            <div className="text-2xl font-semibold text-gray-900">{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}
