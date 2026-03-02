'use client';

import { ReactNode } from 'react';
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
  productViewSummary?: {
    totalViews: number;
    topProducts: { productSlug: string; productName: string; views: number }[];
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

export default function SummaryCards({ data, visitSummary, productViewSummary, colors }: SummaryCardsProps) {
  const totals = calcTotals(data);
  const top3 = (productViewSummary?.topProducts || []).slice(0, 3);
  const cards: { label: string; value: ReactNode; metric: MetricKey | null }[] = [
    { label: 'Người dùng mới', value: formatNumber(totals.users), metric: 'users' },
    {
      label: 'Tổng lượt truy cập',
      value: formatNumber(visitSummary?.rangeVisits ?? totals.visits),
      metric: 'visits',
    },
    {
      label: 'Tổng lượt xem sản phẩm',
      value: formatNumber(productViewSummary?.totalViews ?? 0),
      metric: null,
    },
    {
      label: 'Top sản phẩm được xem nhiều',
      value:
        top3.length > 0 ? (
          <div className="space-y-1">
            {top3.map((p, idx) => (
              <div key={`${p.productName}-${idx}`} className="text-sm text-gray-700 truncate">
                {idx + 1}. {p.productName} ({formatNumber(p.views)})
              </div>
            ))}
          </div>
        ) : (
          'Chưa có dữ liệu'
        ),
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
