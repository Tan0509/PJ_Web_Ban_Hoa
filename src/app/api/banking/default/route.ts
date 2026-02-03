import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import BankingAccount from '@/models/BankingAccount';

// Public read: default banking account for customer transfer page
export async function GET() {
  try {
    await connectMongo();
    const account: any =
      (await BankingAccount.findOne({ active: true, isDefault: true }).lean()) ||
      (await BankingAccount.findOne({ active: true }).sort({ createdAt: -1 }).lean());

    if (!account) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: String(account._id),
        label: account.label,
        bankId: account.bankId,
        bankName: account.bankName,
        accountNo: account.accountNo,
        accountName: account.accountName,
        qrImageDataUrl: account.qrImageDataUrl,
        note: account.note,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

