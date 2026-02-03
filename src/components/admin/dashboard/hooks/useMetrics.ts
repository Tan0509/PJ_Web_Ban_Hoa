'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChartMetric } from '../../chart-system/types';
import {
  mapOrdersApiToChartMetric,
  mapRevenueApiToChartMetric,
  mapRevenueApiToKpi,
  mapUsersApiToChartMetric,
} from '../adapters/metricsAdapters';

type GroupBy = 'day' | 'month' | 'year' | 'hour';

type MetricResult = {
  data: ChartMetric | null;
  loading: boolean;
  error: string | null;
};

type SeriesResult = {
  data: { date: string; revenue: number; orders: number; users: number }[] | null;
  loading: boolean;
  error: string | null;
};

type RangeParams = { from: string; to: string; groupBy?: GroupBy };

async function fetchMetric(endpoint: string, signal: AbortSignal) {
  const res = await fetch(endpoint, { signal });
  if (!res.ok) {
    let message = 'Fetch error';
    try {
      const body = await res.json();
      message = body?.message || message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
  return res.json();
}

function buildQuery(params: RangeParams) {
  const url = new URLSearchParams();
  if (params.from) url.append('from', params.from);
  if (params.to) url.append('to', params.to);
  url.append('groupBy', params.groupBy || 'day');
  return `?${url.toString()}`;
}

function useMetric(
  metric: 'revenue' | 'orders' | 'users',
  range: RangeParams,
  mapper: (resp: any) => ChartMetric
): MetricResult {
  const [data, setData] = useState<ChartMetric | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const query = buildQuery(range);
        // TODO: Replace endpoint if backend changes
        const resp = await fetchMetric(`/api/admin/metrics/${metric}${query}`, controller.signal);
        setData(mapper(resp));
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [metric, range.from, range.to, range.groupBy, mapper]);

  return { data, loading, error };
}

export function useRevenueMetric(range: RangeParams): MetricResult {
  return useMetric('revenue', range, mapRevenueApiToChartMetric);
}

export function useOrdersMetric(range: RangeParams): MetricResult {
  return useMetric('orders', range, mapOrdersApiToChartMetric);
}

export function useUsersMetric(range: RangeParams): MetricResult {
  return useMetric('users', range, mapUsersApiToChartMetric);
}

export function useRevenueKpi(range: RangeParams): MetricResult {
  return useMetric('revenue', range, mapRevenueApiToKpi);
}

export function useCombinedSeries(range: RangeParams): SeriesResult {
  const [data, setData] = useState<SeriesResult['data']>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const query = buildQuery(range);
        const [rev, ord, usr] = await Promise.all([
          fetchMetric(`/api/admin/metrics/revenue${query}`, controller.signal),
          fetchMetric(`/api/admin/metrics/orders${query}`, controller.signal),
          fetchMetric(`/api/admin/metrics/users${query}`, controller.signal),
        ]);
        const labelSet = new Set<string>();
        rev.data?.forEach((d: any) => labelSet.add(d.label));
        ord.data?.forEach((d: any) => labelSet.add(d.label));
        usr.data?.forEach((d: any) => labelSet.add(d.label));
        const labels = Array.from(labelSet).sort();
        const revenueMap = Object.fromEntries((rev.data || []).map((d: any) => [d.label, d.value]));
        const ordersMap = Object.fromEntries((ord.data || []).map((d: any) => [d.label, d.value]));
        const usersMap = Object.fromEntries((usr.data || []).map((d: any) => [d.label, d.value]));
        const merged = labels.map((label) => ({
          date: label,
          revenue: revenueMap[label] || 0,
          orders: ordersMap[label] || 0,
          users: usersMap[label] || 0,
        }));
        setData(merged);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [range.from, range.to, range.groupBy]);

  return { data, loading, error };
}

export function useDefaultRange(): RangeParams {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  return useMemo(() => ({ from: dateStr, to: dateStr, groupBy: 'hour' as GroupBy }), [dateStr]);
}

type BestSellingResult = {
  productName: string | null;
  categoryName: string | null;
  orderCount: number;
  totalOrders: number;
  formatted: string;
  loading: boolean;
  error: string | null;
};

export function useBestSellingProduct(range: { from: string; to: string }): BestSellingResult {
  const [data, setData] = useState<{
    productName: string | null;
    categoryName: string | null;
    orderCount: number;
    totalOrders: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ from: range.from, to: range.to });
        const res = await fetch(`/api/admin/best-selling-product?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Fetch error');
        const json = await res.json();
        setData({
          productName: json.productName ?? null,
          categoryName: json.categoryName ?? null,
          orderCount: typeof json.orderCount === 'number' ? json.orderCount : 0,
          totalOrders: typeof json.totalOrders === 'number' ? json.totalOrders : 0,
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [range.from, range.to]);

  const formatted = useMemo(() => {
    if (!data?.productName) return loading ? '...' : '—';
    const cat = data.categoryName && data.categoryName !== '—' ? ` (${data.categoryName})` : '';
    return `${data.productName}${cat}`;
  }, [data, loading]);

  return {
    productName: data?.productName ?? null,
    categoryName: data?.categoryName ?? null,
    orderCount: data?.orderCount ?? 0,
    totalOrders: data?.totalOrders ?? 0,
    formatted,
    loading,
    error: error ?? null,
  };
}
