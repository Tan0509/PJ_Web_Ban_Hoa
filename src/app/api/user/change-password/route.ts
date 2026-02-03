import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { connectMongo } from '@/lib/mongoose';
import User from '@/models/User';

// MIGRATION: Customer model → User model (single source of truth)

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body || {};
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Thiếu mật khẩu' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'Mật khẩu mới tối thiểu 8 ký tự' }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ success: false, error: 'Mật khẩu mới phải khác mật khẩu cũ' }, { status: 400 });
    }

    await connectMongo();
    // MIGRATION: Customer model → User model
    const user = await User.findById((session.user as any).id);
    if (!user) return NextResponse.json({ success: false, error: 'User không tồn tại' }, { status: 404 });
    if (user.provider && user.provider !== 'local') {
      return NextResponse.json({ success: false, error: 'Tài khoản Google không dùng mật khẩu' }, { status: 400 });
    }
    if (!user.password) {
      return NextResponse.json({ success: false, error: 'Không có mật khẩu để đổi' }, { status: 400 });
    }

    const ok = bcrypt.compareSync(currentPassword, user.password);
    if (!ok) return NextResponse.json({ success: false, error: 'Mật khẩu hiện tại không đúng' }, { status: 400 });

    const hashed = bcrypt.hashSync(newPassword, 10);
    user.password = hashed;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
