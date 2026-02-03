import Link from 'next/link';
import { getEnvSiteOrigin } from '@/lib/siteUrl';

async function fetchCategories() {
  try {
    const base = getEnvSiteOrigin();
    const res = await fetch(`${base}/api/categories`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export default async function Navigation() {
  const categories = await fetchCategories();

  return (
    <div className="bg-[#0f5c5c] text-white">
      <div className="container-section py-3 flex items-center gap-6 text-sm font-semibold uppercase tracking-wide overflow-x-auto">
        <Link href="/" className="text-[#f6c142] whitespace-nowrap">
          Trang chủ
        </Link>
        {categories.map((cat: any) => (
          <Link
            key={cat._id || cat.slug}
            href={`/${cat.slug || ''}`}
            className="whitespace-nowrap hover:text-[#f6c142]"
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
