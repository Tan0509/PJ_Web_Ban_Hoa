import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import CategoryClient from './CategoryClient';

type PageProps = {
  params: Promise<{ slug?: string }> | { slug?: string };
};

/**
 * Trang category: data lấy từ /api/category/[slug], cache client TTL 30p.
 * Quay lại cùng slug + params trong 30p → hiện cache, không gọi lại API.
 */
export default async function CategoryPage({ params }: PageProps) {
  const p = await Promise.resolve(params);
  const slug = typeof p?.slug === 'string' ? p.slug : '';
  if (!slug) return notFound();

  return (
    <Suspense fallback={<div className="container-section py-10 min-h-[40vh] rounded-lg skeleton-shimmer" />}>
      <CategoryClient slug={slug} />
    </Suspense>
  );
}
