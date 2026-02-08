'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

type Category = {
  _id?: string;
  slug?: string;
  name: string;
  active?: boolean;
  order?: number;
};

interface Props {
  variant?: 'desktop' | 'mobile';
  categories?: Category[];
}

const MAX_VISIBLE = 7;

export default function CategoryMenu({ variant = 'desktop', categories: categoriesProp }: Props) {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>(categoriesProp || []);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const normalize = (list: Category[]) =>
    list
      .filter((c) => c?.active !== false)
      .sort((a, b) => ((a as { menuOrder?: number }).menuOrder ?? 0) - ((b as { menuOrder?: number }).menuOrder ?? 0));

  useEffect(() => {
    if (categoriesProp && categoriesProp.length) {
      setCategories(normalize(categoriesProp));
      return;
    }
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) return;
        const json = await res.json();
        const list: Category[] = json?.data || [];
        const filtered = list
          .filter((c) => c?.active !== false)
          .sort((a, b) => ((a as { menuOrder?: number }).menuOrder ?? 0) - ((b as { menuOrder?: number }).menuOrder ?? 0));
        if (mounted) setCategories(filtered);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [categoriesProp]);

  const items = useMemo(
    () => [
      { href: '/', label: 'Trang chủ' },
      ...categories.map((c) => ({
        href: `/category/${c.slug || c._id}`,
        label: c.name,
      })),
    ],
    [categories]
  );

  const visibleItems = useMemo(() => items.slice(0, MAX_VISIBLE), [items]);
  const moreItems = useMemo(() => items.slice(MAX_VISIBLE), [items]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  if (variant === 'mobile') {
    return (
      <div className="flex flex-col py-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-4 py-3 text-sm font-semibold uppercase tracking-normal leading-snug border-b border-white/10 last:border-0"
          >
            {item.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <>
      {visibleItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`whitespace-nowrap hover:text-[#f6c142] ${pathname === item.href ? 'text-[#f6c142]' : ''}`}
        >
          {item.label}
        </Link>
      ))}
      {moreItems.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className={`whitespace-nowrap hover:text-[#f6c142] ${dropdownOpen ? 'text-[#f6c142]' : ''}`}
          >
            XEM THÊM
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1 min-w-[180px] rounded-md bg-gray-50 py-2 shadow-lg ring-1 ring-black/5 z-50">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDropdownOpen(false)}
                  className={`block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 hover:text-[#0f5c5c] ${pathname === item.href ? 'bg-gray-50 text-[#0f5c5c] font-semibold' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
