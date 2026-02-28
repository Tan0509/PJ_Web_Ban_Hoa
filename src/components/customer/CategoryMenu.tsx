'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

type Category = {
  _id?: string;
  slug?: string;
  name: string;
  parentId?: string;
  active?: boolean;
  order?: number;
  menuOrder?: number;
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
  const [hoverMenu, setHoverMenu] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const normalize = (list: Category[]) =>
    list
      .filter((c) => c?.active !== false)
      .sort((a, b) => (a.menuOrder ?? 0) - (b.menuOrder ?? 0) || (a.order ?? 0) - (b.order ?? 0));

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
        if (mounted) setCategories(normalize(list));
      } catch (e) {
        console.error(e);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [categoriesProp]);

  const childMap = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      if (!c.parentId) continue;
      const key = String(c.parentId);
      const curr = map.get(key) || [];
      curr.push(c);
      map.set(key, curr);
    }
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => (a.menuOrder ?? 0) - (b.menuOrder ?? 0) || a.name.localeCompare(b.name));
      map.set(key, list);
    }
    return map;
  }, [categories]);

  const topCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );

  const items = useMemo(
    () => [
      { href: '/', label: 'Trang chủ', children: [] as { href: string; label: string }[] },
      ...topCategories.map((c) => ({
        href: `/category/${c.slug || c._id}`,
        label: c.name,
        children: (childMap.get(String(c._id || '')) || []).map((child) => ({
          href: `/category/${child.slug || child._id}`,
          label: child.name,
        })),
      })),
    ],
    [topCategories, childMap]
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
        {items.flatMap((item, idx) => {
          const parent = (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-3 text-sm font-semibold uppercase tracking-normal leading-snug border-b border-white/10 animate-[menuItemIn_220ms_ease-out] opacity-0"
              style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'forwards' }}
            >
              {item.label}
            </Link>
          );

          if (!item.children?.length) return [parent];

          const children = item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="block pl-8 pr-4 py-2 text-[13px] font-medium text-white/90 border-b border-white/10"
            >
              {child.label}
            </Link>
          ));

          return [parent, ...children];
        })}
      </div>
    );
  }

  return (
    <>
      {visibleItems.map((item) => (
        <div
          key={item.href}
          className="relative"
          onMouseEnter={() => {
            if (item.children?.length) setHoverMenu(item.href);
          }}
          onMouseLeave={() => {
            if (item.children?.length) setHoverMenu(null);
          }}
        >
          <Link
            href={item.href}
            className={`whitespace-nowrap hover:text-[#f6c142] ${
              pathname === item.href || item.children?.some((child) => child.href === pathname) ? 'text-[#f6c142]' : ''
            }`}
          >
            {item.label}
          </Link>
          {item.children?.length ? (
            <div
              className={`absolute left-0 top-full mt-1 min-w-[200px] rounded-md bg-gray-50 py-2 shadow-lg ring-1 ring-black/5 z-50 ${
                hoverMenu === item.href ? 'block' : 'hidden'
              }`}
            >
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 hover:text-[#0f5c5c] ${
                    pathname === child.href ? 'bg-gray-50 text-[#0f5c5c] font-semibold' : ''
                  }`}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
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
