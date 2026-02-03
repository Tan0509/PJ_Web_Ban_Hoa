import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { connectMongo } from '@/lib/mongoose';
import User from '@/models/User';

// MIGRATION: Customer model → User model (single source of truth)

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone } = body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Họ tên không hợp lệ' }, { status: 400 });
    }

    await connectMongo();
    // MIGRATION: Customer model → User model
    const user = await User.findById((session.user as any).id);
    if (!user) return NextResponse.json({ success: false, error: 'User không tồn tại' }, { status: 404 });

    user.name = name.trim();
    if (phone !== undefined) user.phone = typeof phone === 'string' ? phone.trim() : '';

    await user.save();

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        provider: user.provider,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
