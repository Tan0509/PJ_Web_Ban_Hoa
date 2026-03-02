'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChartMetric } from '../../chart-system/types';
import { mapUsersApiToChartMetric, mapVisitsApiToChartMetric } from '../adapters/metricsAdapters';

type GroupBy = 'day' | 'month' | 'year' | 'hour';

type MetricResult = {
  data: ChartMetric | null;
  loading: boolean;
  error: string | null;
};

type SeriesResult = {
  data: { date: string; users: number; visits: number }[] | null;
  loading: boolean;
  error: string | null;
};

type VisitSummary = {
  rangeVisits: number;
  activeDays: number;
  totalDays: number;
  todayVisits: number;
};

type ProductViewSummary = {
  totalViews: number;
  distinctProductCount: number;
  topProducts: { productSlug: string; productName: string; views: number }[];
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

function useMetric(metric: 'users' | 'visits', range: RangeParams, mapper: (resp: any) => ChartMetric): MetricResult {
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

export function useUsersMetric(range: RangeParams): MetricResult {
  return useMetric('users', range, mapUsersApiToChartMetric);
}

export function useVisitsMetric(range: RangeParams): MetricResult {
  return useMetric('visits', range, mapVisitsApiToChartMetric);
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
        const [usr, vst] = await Promise.all([
          fetchMetric(`/api/admin/metrics/users${query}`, controller.signal),
          fetchMetric(`/api/admin/metrics/visits${query}`, controller.signal),
        ]);
        const labelSet = new Set<string>();
        usr.data?.forEach((d: any) => labelSet.add(d.label));
        vst.data?.forEach((d: any) => labelSet.add(d.label));
        const labels = Array.from(labelSet).sort();
        const usersMap = Object.fromEntries((usr.data || []).map((d: any) => [d.label, d.value]));
        const visitsMap = Object.fromEntries((vst.data || []).map((d: any) => [d.label, d.value]));
        const merged = labels.map((label) => ({
          date: label,
          users: usersMap[label] || 0,
          visits: visitsMap[label] || 0,
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

export function useVisitSummary(range: { from: string; to: string }) {
  const [data, setData] = useState<VisitSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ from: range.from, to: range.to });
        const res = await fetch(`/api/admin/visits/summary?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Fetch error');
        const json = await res.json();
        const d = json?.data || {};
        setData({
          rangeVisits: Number(d.rangeVisits || 0),
          activeDays: Number(d.activeDays || 0),
          totalDays: Number(d.totalDays || 0),
          todayVisits: Number(d.todayVisits || 0),
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

  return { data, loading, error };
}

export function useProductViewSummary(range: { from: string; to: string; limit?: number }) {
  const [data, setData] = useState<ProductViewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          from: range.from,
          to: range.to,
          limit: String(range.limit || 10),
        });
        const res = await fetch(`/api/admin/product-views/summary?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Fetch error');
        const json = await res.json();
        const d = json?.data || {};
        setData({
          totalViews: Number(d.totalViews || 0),
          distinctProductCount: Number(d.distinctProductCount || 0),
          topProducts: Array.isArray(d.topProducts)
            ? d.topProducts.map((p: any) => ({
                productSlug: String(p.productSlug || ''),
                productName:
                  String(p.productName || '').trim() && String(p.productName || '').trim() !== String(p.productSlug || '').trim()
                    ? String(p.productName || '').trim()
                    : 'Sản phẩm không rõ tên',
                views: Number(p.views || 0),
              }))
            : [],
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
  }, [range.from, range.to, range.limit]);

  return { data, loading, error };
}
