import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';

type GroupBy = 'day' | 'month' | 'hour';
type MetricKey = 'revenue' | 'orders' | 'users';

type ApiResponse = {
  metric: MetricKey;
  unit: 'VND' | 'orders' | 'users';
  groupBy: GroupBy;
  from: string;
  to: string;
  data: { label: string; value: number }[];
};

// This endpoint is optimized for chart visualization
// Frontend relies on stable response format

const METRIC_UNITS: Record<MetricKey, ApiResponse['unit']> = {
  revenue: 'VND',
  orders: 'orders',
  users: 'users',
};

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateLabel(date: Date, groupBy: GroupBy) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  const hour = `${date.getUTCHours()}`.padStart(2, '0');
  if (groupBy === 'month') return `${year}-${month}`;
  if (groupBy === 'hour') return `${year}-${month}-${day}-${hour}`;
  return `${year}-${month}-${day}`;
}

function buildDateRange(from: Date, to: Date, groupBy: GroupBy) {
  if (groupBy === 'hour') {
    const labels: string[] = [];
    const base = `${from.getUTCFullYear()}-${`${from.getUTCMonth() + 1}`.padStart(2, '0')}-${`${from.getUTCDate()}`.padStart(2, '0')}`;
    for (let h = 0; h <= 23; h++) {
      labels.push(`${base}-${`${h}`.padStart(2, '0')}`);
    }
    return labels;
  }
  const labels: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    labels.push(formatDateLabel(cursor, groupBy));
    if (groupBy === 'month') {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      cursor.setUTCDate(1);
    } else {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return labels;
}

async function aggregateRevenue(from: Date, to: Date, groupBy: GroupBy) {
  const groupFormat = groupBy === 'month' ? '%Y-%m' : groupBy === 'hour' ? '%Y-%m-%d-%H' : '%Y-%m-%d';
  const agg = await Order.aggregate<{ _id: string; total: number }>([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, total: { $sum: '$totalAmount' } } },
  ]);
  return agg;
}

async function aggregateOrders(from: Date, to: Date, groupBy: GroupBy) {
  const groupFormat = groupBy === 'month' ? '%Y-%m' : groupBy === 'hour' ? '%Y-%m-%d-%H' : '%Y-%m-%d';
  const agg = await Order.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
  ]);
  return agg;
}

async function aggregateUsers(from: Date, to: Date, groupBy: GroupBy) {
  const groupFormat = groupBy === 'month' ? '%Y-%m' : groupBy === 'hour' ? '%Y-%m-%d-%H' : '%Y-%m-%d';
  const agg = await Customer.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
  ]);
  return agg;
}

function fillGaps(labels: string[], values: Record<string, number>) {
  return labels.map((label) => ({
    label,
    value: values[label] || 0,
  }));
}

import { isAdminFromSession } from '@/lib/authHelpers';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse | { message: string }>) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  // AUTH REFACTOR: Use NextAuth session instead of cookie-based auth
  if (!(await isAdminFromSession(req, res))) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const metricParam = (req.query.metric as string) || '';
  const metric = metricParam as MetricKey;
  if (!['revenue', 'orders', 'users'].includes(metric)) {
    return res.status(400).json({ message: 'Unsupported metric' });
  }

  const groupByParam = (req.query.groupBy as string) || 'day';
  const groupBy: GroupBy = groupByParam === 'month' ? 'month' : groupByParam === 'hour' ? 'hour' : 'day';

  const today = new Date();
  const defaultFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 29));
  const defaultTo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const from = parseDate(req.query.from as string) || defaultFrom;
  const to = parseDate(req.query.to as string) || defaultTo;

  // Normalize range to UTC start/end of day
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999));

  await dbConnect();

  let raw: { _id: string; total?: number; count?: number }[] = [];
  if (metric === 'revenue') {
    raw = await aggregateRevenue(start, end, groupBy);
  } else if (metric === 'orders') {
    raw = await aggregateOrders(start, end, groupBy);
  } else if (metric === 'users') {
    raw = await aggregateUsers(start, end, groupBy);
  }

  const valueMap: Record<string, number> = {};
  raw.forEach((row) => {
    const value = typeof row.total === 'number' ? row.total : row.count || 0;
    valueMap[row._id] = value;
  });

  const labels = buildDateRange(start, end, groupBy);
  const data = fillGaps(labels, valueMap);

  return res.status(200).json({
    metric,
    unit: METRIC_UNITS[metric],
    groupBy,
    from: formatDateLabel(start, 'day'),
    to: formatDateLabel(end, 'day'),
    data,
  });
}
