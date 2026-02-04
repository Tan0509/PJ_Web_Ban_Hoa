import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';

type PageProps = {
  params: Promise<{ slug?: string }> | { slug?: string };
};

/**
 * Trang product: data lấy từ /api/product/[slug], cache client TTL 30p.
 * Quay lại cùng slug trong 30p → hiện cache, không gọi lại API.
 */
export default async function ProductPage({ params }: PageProps) {
  const p = await Promise.resolve(params);
  const slugRaw = p?.slug;
  if (!slugRaw || typeof slugRaw !== 'string') return notFound();

  const cleanSlug = slugRaw.replace(/"/g, '');
  if (!cleanSlug) return notFound();

  return <ProductClient slug={cleanSlug} />;
}
