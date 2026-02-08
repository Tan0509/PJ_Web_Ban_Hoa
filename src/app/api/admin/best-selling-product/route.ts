import { NextResponse } from 'next/server';
import { getSessionForAppRouter } from '@/lib/authHelpers';
import { json500 } from '@/lib/helpers/apiResponse';
import { connectMongo } from '@/lib/mongoose';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Category from '@/models/Category';

export const runtime = 'nodejs';

function isAdminRole(role?: string) {
  return role === 'admin' || role === 'staff';
}

export async function GET(req: Request) {
  try {
    const session = await getSessionForAppRouter();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!isAdminRole(role)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toParam ? new Date(toParam) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return NextResponse.json({ message: 'Invalid date range' }, { status: 400 });
    }

    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    await connectMongo();

    const agg = await Order.aggregate<{ productId: string; totalQty: number }>([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQty: { $sum: '$items.quantity' },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 1 },
      { $project: { productId: '$_id', totalQty: 1, _id: 0 } },
    ]);

    if (!agg.length || !agg[0].productId) {
      const totalOrders = await Order.countDocuments({ createdAt: { $gte: start, $lte: end } });
      return NextResponse.json({
        productName: null,
        categoryName: null,
        orderCount: 0,
        totalOrders,
      });
    }

    const productId = agg[0].productId;
    const [product, orderCount, totalOrders] = await Promise.all([
      Product.findById(productId)
        .select('name categorySlug categorySlugs categoryId categoryIds')
        .lean(),
      Order.countDocuments({
        createdAt: { $gte: start, $lte: end },
        'items.productId': productId,
      }),
      Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    ]);
    const productDoc = product as any;

    if (!productDoc) {
      return NextResponse.json({
        productName: 'Sản phẩm (đã xóa hoặc không tìm thấy)',
        categoryName: '—',
        orderCount: 0,
        totalOrders: totalOrders ?? 0,
      });
    }

    let categoryName = '—';
    const catSlug = productDoc.categorySlug || productDoc.categorySlugs?.[0];
    const catId = productDoc.categoryId || productDoc.categoryIds?.[0];
    if (catSlug) {
      const cat = await Category.findOne({ slug: catSlug }).select('name').lean();
      if (cat) categoryName = (cat as any).name;
    } else if (catId) {
      const cat = await Category.findById(catId).select('name').lean();
      if (cat) categoryName = (cat as any).name;
    }

    return NextResponse.json({
      productName: productDoc.name,
      categoryName,
      orderCount: orderCount ?? 0,
      totalOrders: totalOrders ?? 0,
    });
  } catch (e) {
    console.error(e);
    return json500(e, { key: 'message' });
  }
}
