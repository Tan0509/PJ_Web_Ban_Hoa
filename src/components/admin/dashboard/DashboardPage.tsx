'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import ChartControls from './components/ChartControls';
import ChartRenderer from './components/ChartRenderer';
import SummaryCards from './components/SummaryCards';
import { ChartType, DateRange, MetricColorState, MetricKey } from './types/dashboard';
import { DatePresetKey, DEFAULT_COLORS } from './utils/chartConfig';
import { useCombinedSeries, useDefaultRange, useProductViewSummary, useVisitSummary } from './hooks/useMetrics';

const DASHBOARD_FILTER_KEY = 'dashboardFilter';

function getDefaultRange(): DateRange {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  return { from: dateStr, to: dateStr };
}

function parseStoredFilter(): { dateRange: DateRange; activePreset: DatePresetKey | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DASHBOARD_FILTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { activePreset?: DatePresetKey | null; dateRange?: DateRange };
    const from = parsed?.dateRange?.from;
    const to = parsed?.dateRange?.to;
    const preset = parsed?.activePreset;
    if (from && to && from <= to) {
      const dateRange: DateRange = { from, to };
      const activePreset =
        preset === 7 || preset === 30 || preset === 'month' || preset === 'year' ? preset : null;
      return { dateRange, activePreset };
    }
    return null;
  } catch {
    return null;
  }
}

function getInitialFilter(): { dateRange: DateRange; activePreset: DatePresetKey | null } {
  const stored = parseStoredFilter();
  if (stored) {
    if (stored.activePreset !== null) {
      return { dateRange: getRangeForPreset(stored.activePreset), activePreset: stored.activePreset };
    }
    return { dateRange: stored.dateRange, activePreset: null };
  }
  return { dateRange: getDefaultRange(), activePreset: null };
}

function getRangeForPreset(preset: DatePresetKey): DateRange {
  const today = new Date();
  if (preset === 7) {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }
  if (preset === 30) {
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }
  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }
  // year
  const y = today.getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export default function DashboardPage() {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['visits']);
  const [colors, setColors] = useState<MetricColorState>({
    users: { mode: 'default', color: DEFAULT_COLORS.users },
    visits: { mode: 'default', color: DEFAULT_COLORS.visits },
  });
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange);
  const [activePreset, setActivePreset] = useState<DatePresetKey | null>(null);
  const [hourFrom, setHourFrom] = useState(0);
  const [hourTo, setHourTo] = useState(23);
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productModalLoading, setProductModalLoading] = useState(false);
  const [productModalError, setProductModalError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState('');
  const defaultRange = useDefaultRange();

  useEffect(() => {
    const stored = parseStoredFilter();
    if (stored) {
      if (stored.activePreset !== null) {
        setDateRange(getRangeForPreset(stored.activePreset));
        setActivePreset(stored.activePreset);
      } else {
        setDateRange(stored.dateRange);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      DASHBOARD_FILTER_KEY,
      JSON.stringify({ activePreset, dateRange })
    );
  }, [activePreset, dateRange]);

  const validRange = useMemo(() => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      const fallback = { ...defaultRange, groupBy: (activePreset === 'month' ? 'month' : activePreset === 'year' ? 'year' : dateRange.from === dateRange.to ? 'hour' : 'day') as 'day' | 'month' | 'year' | 'hour' };
      return fallback;
    }
    const isSingleDay = dateRange.from === dateRange.to;
    const groupBy: 'day' | 'month' | 'year' | 'hour' = activePreset === 'month' ? 'month' : activePreset === 'year' ? 'year' : isSingleDay ? 'hour' : 'day';
    return { from: dateRange.from, to: dateRange.to, groupBy };
  }, [dateRange.from, dateRange.to, defaultRange, activePreset]);

  const isSingleDayMode = validRange.from === validRange.to && validRange.groupBy === 'hour';

  const handlePresetClick = useCallback((preset: DatePresetKey) => {
    if (activePreset === preset) {
      setActivePreset(null);
      setDateRange(getDefaultRange());
      return;
    }
    setActivePreset(preset);
    setDateRange(getRangeForPreset(preset));
  }, [activePreset]);

  const handleDateRangeChange = useCallback((range: DateRange, options?: { clearPreset?: boolean }) => {
    setDateRange(range);
    if (options?.clearPreset !== false) setActivePreset(null);
  }, []);

  const { data: combinedSeries, loading: seriesLoading, error: seriesError } = useCombinedSeries(validRange);
  const filteredData = combinedSeries || [];
  const { data: visitSummary, loading: visitLoading, error: visitError } = useVisitSummary({
    from: validRange.from,
    to: validRange.to,
  });
  const {
    data: productViewSummary,
    loading: productViewLoading,
    error: productViewError,
  } = useProductViewSummary({
    from: validRange.from,
    to: validRange.to,
    limit: 10,
  });

  const appliedColors = useMemo(
    () =>
      (['users', 'visits'] as MetricKey[]).reduce((acc, key) => {
        const cfg = colors[key];
        acc[key] = cfg.mode === 'custom' ? cfg.color : DEFAULT_COLORS[key];
        return acc;
      }, {} as Record<MetricKey, string>),
    [colors]
  );

  const handleMetricSelect = (metric: MetricKey) => {
    setSelectedMetrics([metric]);
  };

  const closeProductModal = useCallback(() => {
    setSelectedProductSlug(null);
    setSelectedProduct(null);
    setProductModalLoading(false);
    setProductModalError(null);
    setActiveImage('');
  }, []);

  const openProductModal = useCallback(async (slug: string) => {
    if (!slug) return;
    setSelectedProductSlug(slug);
    setSelectedProduct(null);
    setProductModalError(null);
    setProductModalLoading(true);
    setActiveImage('');
    try {
      const res = await fetch(`/api/product/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Không tải được chi tiết sản phẩm');
      const json = await res.json();
      const product = json?.data?.product;
      if (!product) throw new Error('Không có dữ liệu sản phẩm');
      setSelectedProduct(product);
      const firstImage = Array.isArray(product.images) ? product.images.find(Boolean) : '';
      setActiveImage(firstImage || '');
    } catch (err: any) {
      setProductModalError(err?.message || 'Không tải được chi tiết sản phẩm');
    } finally {
      setProductModalLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <SummaryCards
        data={filteredData}
        visitSummary={visitSummary || undefined}
        colors={appliedColors}
      />

      <ChartControls
        chartType={chartType}
        onChartTypeChange={setChartType}
        selectedMetrics={selectedMetrics}
        onMetricSelect={handleMetricSelect}
        colors={colors}
        onColorModeChange={(metric, mode) =>
          setColors((prev) => ({ ...prev, [metric]: { ...prev[metric], mode } }))
        }
        onColorChange={(metric, color) =>
          setColors((prev) => ({ ...prev, [metric]: { ...prev[metric], color } }))
        }
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        activePreset={activePreset}
        onPresetClick={handlePresetClick}
        visitSummary={{
          rangeVisits: visitSummary?.rangeVisits || 0,
          activeDays: visitSummary?.activeDays || 0,
          totalDays: visitSummary?.totalDays || 0,
          todayVisits: visitSummary?.todayVisits || 0,
          loading: visitLoading,
          error: visitError,
        }}
      />

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Phân tích</h2>
            <p className="text-sm text-gray-500">Biểu đồ cập nhật tức thì theo bộ lọc của bạn.</p>
          </div>
          {isSingleDayMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Khoảng giờ:</span>
              <select
                value={hourFrom}
                onChange={(e) => setHourFrom(Number(e.target.value))}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i}h</option>
                ))}
              </select>
              <span className="text-gray-400">–</span>
              <select
                value={hourTo}
                onChange={(e) => setHourTo(Number(e.target.value))}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i}h</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {seriesLoading ? (
          <div className="h-80 rounded-lg border border-dashed border-gray-200 bg-gray-50 animate-pulse" />
        ) : seriesError ? (
          <div className="h-80 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-red-600">
            {seriesError}
          </div>
        ) : (
          <ChartRenderer
            chartType={chartType}
            selectedMetrics={selectedMetrics}
            colors={appliedColors}
            data={filteredData}
            dateRange={validRange}
            filterType={validRange.groupBy}
            hourRange={isSingleDayMode ? { from: hourFrom, to: hourTo } : undefined}
          />
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Lượt xem sản phẩm</h2>
          <p className="text-sm text-gray-500">Top sản phẩm được xem trong khoảng thời gian đang lọc.</p>
        </div>
        {productViewLoading ? (
          <div className="h-40 rounded-lg border border-dashed border-gray-200 bg-gray-50 animate-pulse" />
        ) : productViewError ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-red-600">
            Không tải được dữ liệu lượt xem sản phẩm.
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-md bg-sky-50 text-sky-700 px-3 py-1">
                Tổng lượt xem: <strong>{productViewSummary?.totalViews || 0}</strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 text-emerald-700 px-3 py-1">
                Sản phẩm có lượt xem: <strong>{productViewSummary?.distinctProductCount || 0}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Sản phẩm</th>
                    <th className="py-2 pr-3">Slug</th>
                    <th className="py-2 text-right">Lượt xem</th>
                  </tr>
                </thead>
                <tbody>
                  {(productViewSummary?.topProducts || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">
                        Chưa có dữ liệu.
                      </td>
                    </tr>
                  ) : (
                    (productViewSummary?.topProducts || []).map((p, idx) => (
                      <tr key={`${p.productSlug}-${idx}`} className="border-b border-gray-100">
                        <td className="py-2 pr-3 text-gray-500">{idx + 1}</td>
                        <td className="py-2 pr-3 font-medium text-gray-900">
                          {p.productSlug ? (
                            <button
                              type="button"
                              onClick={() => openProductModal(p.productSlug)}
                              className="text-left text-emerald-700 hover:text-emerald-800 hover:underline"
                            >
                              {p.productName || p.productSlug || '—'}
                            </button>
                          ) : (
                            p.productName || '—'
                          )}
                        </td>
                        <td className="py-2 pr-3 text-gray-500">{p.productSlug || '—'}</td>
                        <td className="py-2 text-right font-semibold text-gray-900">{p.views}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selectedProductSlug && (
        <div
          className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4"
          onClick={closeProductModal}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Chi tiết sản phẩm</h3>
              <button
                type="button"
                onClick={closeProductModal}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Đóng
              </button>
            </div>
            <div className="p-5">
              {productModalLoading ? (
                <div className="h-64 animate-pulse rounded-lg border border-dashed border-gray-200 bg-gray-50" />
              ) : productModalError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {productModalError}
                </div>
              ) : selectedProduct ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      {activeImage ? (
                        <Image
                          src={activeImage}
                          alt={selectedProduct.name || selectedProductSlug}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          Không có ảnh
                        </div>
                      )}
                    </div>
                    {Array.isArray(selectedProduct.images) && selectedProduct.images.filter(Boolean).length > 1 && (
                      <div className="grid grid-cols-5 gap-2">
                        {selectedProduct.images.filter(Boolean).map((img: string, idx: number) => (
                          <button
                            type="button"
                            key={`${img}-${idx}`}
                            onClick={() => setActiveImage(img)}
                            className={`relative aspect-square overflow-hidden rounded-md border ${
                              activeImage === img ? 'border-emerald-600 ring-1 ring-emerald-500' : 'border-gray-200'
                            }`}
                          >
                            <Image
                              src={img}
                              alt={`${selectedProduct.name}-${idx}`}
                              fill
                              sizes="96px"
                              className="object-cover"
                              unoptimized
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Tên sản phẩm</div>
                      <div className="text-xl font-semibold text-gray-900">{selectedProduct.name || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Slug</div>
                      <div className="text-sm text-gray-700">{selectedProduct.slug || selectedProductSlug}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Giá</div>
                      <div className="text-sm text-gray-700">
                        {Number.isFinite(Number(selectedProduct.price))
                          ? `${Number(selectedProduct.price).toLocaleString('vi-VN')} VND`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Mô tả ngắn</div>
                      <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                        {selectedProduct.metaDescription || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Mô tả chi tiết</div>
                      <div className="max-h-40 overflow-auto rounded-md bg-gray-50 p-3 text-sm whitespace-pre-line text-gray-700">
                        {selectedProduct.description || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  Không có dữ liệu sản phẩm.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
