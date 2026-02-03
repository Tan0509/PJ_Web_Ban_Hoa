'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type CategoryItem = { _id?: string; slug?: string; name: string; menuOrder?: number; active?: boolean };

type Props = {
  categoryName: string;
  totalProducts: number;
  slug: string;
  productFilters?: {
    types: { enabled: boolean; items: { id: string; label: string }[] };
    colors: { enabled: boolean; items: { id: string; label: string }[] };
  };
};

const FALLBACK_COLOR_OPTIONS = ['Đỏ', 'Hồng', 'Trắng', 'Vàng', 'Xanh', 'Tím'];
const FALLBACK_TYPE_OPTIONS = ['Bó hoa', 'Giỏ hoa', 'Hộp hoa', 'Hoa cưới', 'Hoa chúc mừng'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'popular', label: 'Phổ biến' },
  { value: 'price-asc', label: 'Giá thấp → cao' },
  { value: 'price-desc', label: 'Giá cao → thấp' },
];

export default function CategoryFilterSidebar({ categoryName, totalProducts, slug, productFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Use productFilters from props if provided (fetched in Server Component), otherwise use fallback
  const typesEnabled = productFilters?.types?.enabled ?? true;
  const colorsEnabled = productFilters?.colors?.enabled ?? true;
  const typeOptionsFromProps = productFilters?.types?.items?.map((x) => x.label) || [];
  const colorOptionsFromProps = productFilters?.colors?.items?.map((x) => x.label) || [];

  const [colorOptions, setColorOptions] = useState<string[]>(
    colorOptionsFromProps.length > 0 ? colorOptionsFromProps : FALLBACK_COLOR_OPTIONS
  );
  const [typeOptions, setTypeOptions] = useState<string[]>(
    typeOptionsFromProps.length > 0 ? typeOptionsFromProps : FALLBACK_TYPE_OPTIONS
  );
  const [showColorFilter, setShowColorFilter] = useState(colorsEnabled);
  const [showTypeFilter, setShowTypeFilter] = useState(typesEnabled);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const list: CategoryItem[] = json?.data || [];
        const filtered = list
          .filter((c) => c?.active !== false)
          .sort((a, b) => (a.menuOrder ?? 0) - (b.menuOrder ?? 0));
        if (mounted) setCategories(filtered);
      } catch {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Only fetch if productFilters not provided (fallback for edge cases)
  useEffect(() => {
    if (productFilters) return; // Skip fetch if data already provided from Server Component

    const load = async () => {
      try {
        const res = await fetch('/api/product-filters');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const pf = data?.data || {};
        const typesEnabled = !!pf?.types?.enabled;
        const colorsEnabled = !!pf?.colors?.enabled;
        const types = Array.isArray(pf?.types?.items) ? pf.types.items.map((x: any) => String(x?.label || '').trim()).filter(Boolean) : [];
        const colors = Array.isArray(pf?.colors?.items) ? pf.colors.items.map((x: any) => String(x?.label || '').trim()).filter(Boolean) : [];
        setShowTypeFilter(typesEnabled);
        setShowColorFilter(colorsEnabled);
        if (types.length) setTypeOptions(types);
        if (colors.length) setColorOptions(colors);
      } catch {
        // keep fallback
      }
    };
    load();
  }, [productFilters]);

  const initial = useMemo(() => {
    if (!searchParams) {
      return {
        minPrice: '',
        maxPrice: '',
        colors: [],
        types: [],
        sort: 'newest',
      };
    }
    const getList = (key: string) => {
      const raw = searchParams.get(key);
      if (!raw) return [];
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    };
    return {
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      colors: getList('color'),
      types: getList('type'),
      sort: searchParams.get('sort') || 'newest',
    };
  }, [searchParams]);

  const [minPrice, setMinPrice] = useState(initial.minPrice);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice);
  const [colors, setColors] = useState<string[]>(initial.colors);
  const [types, setTypes] = useState<string[]>(initial.types);
  const [sort, setSort] = useState(initial.sort);

  const toggleInList = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (colors.length) params.set('color', colors.join(','));
    if (types.length) params.set('type', types.join(','));
    if (sort) params.set('sort', sort);
    params.set('page', '1'); // reset page when filter changes
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <div className="space-y-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">{categoryName}</div>
          <div className="text-sm text-gray-500">Tổng sản phẩm: {totalProducts}</div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">Khoảng giá</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              inputMode="numeric"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">Loại hoa</div>
          <div className="space-y-2">
            {!showTypeFilter ? (
              <div className="text-xs text-gray-500">Bộ lọc loại hoa đang tắt.</div>
            ) : typeOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#0f5c5c] focus:ring-[#0f5c5c]"
                  checked={types.includes(opt)}
                  onChange={() => setTypes((prev) => toggleInList(prev, opt))}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">Màu sắc</div>
          <div className="space-y-2">
            {!showColorFilter ? (
              <div className="text-xs text-gray-500">Bộ lọc màu sắc đang tắt.</div>
            ) : colorOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#0f5c5c] focus:ring-[#0f5c5c]"
                  checked={colors.includes(opt)}
                  onChange={() => setColors((prev) => toggleInList(prev, opt))}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">Sắp xếp</div>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={applyFilters}
          className="w-full rounded-md bg-[#0f5c5c] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#0c4d4d] transition"
        >
          Áp dụng
        </button>

        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="text-sm font-semibold text-gray-900">Tất cả danh mục</div>
          <ul className="space-y-1">
            {categories.map((c) => {
              const href = `/category/${c.slug || c._id}`;
              const isCurrent = (c.slug || '') === slug;
              return (
                <li key={c._id || c.slug || c.name}>
                  <Link
                    href={href}
                    className={`block rounded-md px-2 py-1.5 text-sm transition ${
                      isCurrent
                        ? 'bg-[#0f5c5c]/10 text-[#0f5c5c] font-semibold'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#0f5c5c]'
                    }`}
                  >
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
