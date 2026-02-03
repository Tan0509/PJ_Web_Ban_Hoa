'use client';

import { DashboardDataPoint, MetricKey } from '../types/dashboard';
import { formatCurrency, formatNumber } from '../utils/chartConfig';

type SummaryCardsProps = {
  data: DashboardDataPoint[];
  bestSeller?: string;
  bestSellerInfo?: {
    productName: string | null;
    categoryName: string | null;
    orderCount?: number;
    totalOrders?: number;
  };
  colors?: Record<MetricKey, string>;
};

function calcTotals(data: DashboardDataPoint[]) {
  return data.reduce(
    (acc, item) => {
      acc.revenue += item.revenue;
      acc.orders += item.orders;
      acc.users += item.users;
      return acc;
    },
    { revenue: 0, orders: 0, users: 0 }
  );
}

export default function SummaryCards({ data, bestSeller, bestSellerInfo, colors }: SummaryCardsProps) {
  const totals = calcTotals(data);
  const cards: { label: string; value: string; metric: MetricKey | null }[] = [
    { label: 'Tổng doanh thu', value: formatCurrency(totals.revenue), metric: 'revenue' },
    { label: 'Tổng đơn hàng', value: formatNumber(totals.orders), metric: 'orders' },
    { label: 'Người dùng mới', value: formatNumber(totals.users), metric: 'users' },
    { label: 'Sản phẩm bán chạy', value: bestSeller ?? '', metric: null },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.slice(0, 3).map((card) => {
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
      {/* Thẻ Sản phẩm bán chạy: bố cục riêng, dễ đọc */}
      <div className="rounded-lg p-4 shadow-sm flex flex-col gap-2 border border-gray-200 bg-gradient-to-br from-amber-50/40 to-orange-50/25 dark:from-gray-800/40 dark:to-gray-800/30">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" aria-hidden>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          </span>
          <span>Sản phẩm bán chạy</span>
        </div>
        {bestSellerInfo?.productName ? (
          <div className="flex flex-col gap-0.5 min-h-[2.5rem]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 flex-1 min-w-0" title={bestSellerInfo.productName}>
                {bestSellerInfo.productName}
              </p>
              {(typeof bestSellerInfo.orderCount === 'number' || typeof bestSellerInfo.totalOrders === 'number') && (
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap flex-shrink-0">
                  {bestSellerInfo.orderCount ?? 0}/{bestSellerInfo.totalOrders ?? 0} đơn
                </span>
              )}
            </div>
            {bestSellerInfo.categoryName && bestSellerInfo.categoryName !== '—' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {bestSellerInfo.categoryName}
              </p>
            )}
          </div>
        ) : (
          <p className="text-base text-gray-500 dark:text-gray-400 italic min-h-[2.5rem] flex items-center">
            {bestSeller || 'Chưa có dữ liệu trong khoảng thời gian này'}
          </p>
        )}
      </div>
    </div>
  );
}
