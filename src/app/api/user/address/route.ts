import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { connectMongo } from '@/lib/mongoose';
import User from '@/models/User';

// MIGRATION: Customer model → User model (single source of truth)

type AddressPayload = {
  recipient?: string;
  phone?: string;
  city?: string;
  district?: string;
  ward?: string;
  detail?: string;
  isDefault?: boolean;
};

function validatePhone(phone?: string) {
  if (!phone) return false;
  return /^0\d{9,10}$/.test(phone);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as AddressPayload;
    const { recipient, phone, city, district, ward, detail, isDefault } = body || {};
    if (!recipient || !phone || !city || !district || !ward || !detail) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin địa chỉ' }, { status: 400 });
    }
    if (!validatePhone(phone)) {
      return NextResponse.json({ success: false, error: 'Số điện thoại không hợp lệ' }, { status: 400 });
    }

    await connectMongo();
    // MIGRATION: Customer model → User model
    const user = await User.findById((session.user as any).id);
    if (!user) return NextResponse.json({ success: false, error: 'User không tồn tại' }, { status: 404 });

    const newAddress = {
      recipient: recipient.trim(),
      phone: phone.trim(),
      city: city.trim(),
      district: district.trim(),
      ward: ward.trim(),
      detail: detail.trim(),
      isDefault: !!isDefault,
    };

    if (!Array.isArray(user.address)) user.address = [];
    if (isDefault) {
      user.address = user.address.map((a: any) => ({ ...a, isDefault: false }));
    }
    user.address.push(newAddress);

    await user.save();

    return NextResponse.json({ success: true, data: user.address || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
