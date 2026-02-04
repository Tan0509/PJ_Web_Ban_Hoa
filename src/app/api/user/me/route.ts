import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/authHelpers';
import { json500 } from '@/lib/helpers/apiResponse';
import { connectMongo } from '@/lib/mongoose';
import User from '@/models/User';

// MIGRATION: Customer model → User model (single source of truth)

type UserLean = {
  _id: unknown;
  name: string;
  email: string;
  phone?: string;
  provider?: string;
  role: string;
  avatar?: string;
  address?: unknown[];
};

export async function GET() {
  try {
    const auth = await requireSession();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectMongo();
    // MIGRATION: Customer model → User model
    // Performance: Only select fields needed for checkout/profile
    const user = await User.findById(auth.userId)
      .select('name email phone provider role avatar address')
      .lean<UserLean | null>();
    if (!user || !user._id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        provider: user.provider,
        role: user.role,
        avatar: user.avatar,
        address: user.address || [],
      },
    });
  } catch (err) {
    return json500(err);
  }
}
