import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/authHelpers';
import { json500 } from '@/lib/helpers/apiResponse';
import { isValidVietnamesePhone } from '@/lib/helpers/validation';
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

export async function POST(req: Request) {
  try {
    const auth = await requireSession();
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as AddressPayload;
    const { recipient, phone, city, district, ward, detail, isDefault } = body || {};
    if (!recipient || !phone || !city || !district || !ward || !detail) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin địa chỉ' }, { status: 400 });
    }
    if (!isValidVietnamesePhone(phone)) {
      return NextResponse.json({ success: false, error: 'Số điện thoại không hợp lệ' }, { status: 400 });
    }

    await connectMongo();
    // MIGRATION: Customer model → User model
    const user = await User.findById(auth.userId);
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
  } catch (err) {
    return json500(err);
  }
}
