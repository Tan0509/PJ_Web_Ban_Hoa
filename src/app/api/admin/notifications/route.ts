import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { connectMongo } from '@/lib/mongoose';
import AdminNotification from '@/models/AdminNotification';

export const runtime = 'nodejs';

function isAdminRole(role?: string) {
  return role === 'admin' || role === 'staff';
}

function unreadFilter(userId: string) {
  return {
    $or: [{ readBy: { $exists: false } }, { readBy: { $not: { $elemMatch: { $eq: userId } } } }],
  };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    const role = (session?.user as any)?.role as string | undefined;
    if (!userId || !isAdminRole(role)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 15)));

    await connectMongo();

    const [items, unreadCount] = await Promise.all([
      AdminNotification.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      AdminNotification.countDocuments(unreadFilter(String(userId))),
    ]);

    return NextResponse.json({
      success: true,
      data: { items, unreadCount },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    const role = (session?.user as any)?.role as string | undefined;
    if (!userId || !isAdminRole(role)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const all = !!body?.all;
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map((x: any) => String(x)) : [];

    await connectMongo();

    if (all) {
      await AdminNotification.updateMany(unreadFilter(String(userId)), { $addToSet: { readBy: String(userId) } });
      return NextResponse.json({ success: true });
    }

    if (ids.length) {
      await AdminNotification.updateMany({ _id: { $in: ids } }, { $addToSet: { readBy: String(userId) } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: 'Missing ids or all' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

