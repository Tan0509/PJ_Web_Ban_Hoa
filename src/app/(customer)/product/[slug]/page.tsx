import { notFound } from 'next/navigation';
import Product from '@/models/Product';
import { connectMongo } from '@/lib/mongoose';
import ProductDetail from '@/components/customer/ProductDetail';

async function getProduct(slug: string) {
  try {
    await connectMongo();
    // Customer-side: chỉ hiển thị sản phẩm active
    const bySlug = await Product.findOne({ slug, active: true });
    if (bySlug) return JSON.parse(JSON.stringify(bySlug));
    // fallback: treat slug as id
    try {
      const byId = await Product.findOne({ _id: slug, active: true });
      if (byId) return JSON.parse(JSON.stringify(byId));
    } catch {
      /* ignore */
    }
    return null;
  } catch (err) {
    console.error('[ProductPage] getProduct error:', err);
    return null;
  }
}

type PageProps = {
  params: Promise<{ slug?: string }> | { slug?: string };
};

export default async function ProductPage({ params }: PageProps) {
  const p = await Promise.resolve(params);
  const slugRaw = p?.slug;
  if (!slugRaw || typeof slugRaw !== 'string') return notFound();

  const cleanSlug = slugRaw.replace(/"/g, '');
  if (!cleanSlug) return notFound();

  const product = await getProduct(cleanSlug);
  if (!product || !product._id) return notFound();

  let related: unknown[] = [];
  try {
    await connectMongo();
    // Customer-side: chỉ hiển thị sản phẩm active
    related = await Product.find({
      _id: { $ne: product._id },
      active: true,
      $or: [
        { categorySlug: product.categorySlug },
        { categoryId: product.categoryId },
        { categoryIds: product.categoryId },
        ...(product.categoryIds || []).map((id: string) => ({ categoryIds: id })),
      ],
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
  } catch (err) {
    console.error('[ProductPage] related products error:', err);
    // Continue with empty related products
  }

  return <ProductDetail product={product as any} related={related as any} />;
}
