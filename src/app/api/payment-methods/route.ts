import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AppSetting from '@/models/AppSetting';

export const runtime = 'nodejs';
// Cache API response for 60 seconds
export const revalidate = 60;

const DEFAULT_PAYMENT_METHODS = {
  cod: true,
  banking: true,
  vnpay: true,
  momo: true,
};

function sanitizePaymentMethods(v: any) {
  if (!v || typeof v !== 'object') return DEFAULT_PAYMENT_METHODS;
  return {
    cod: typeof v.cod === 'boolean' ? v.cod : DEFAULT_PAYMENT_METHODS.cod,
    banking: typeof v.banking === 'boolean' ? v.banking : DEFAULT_PAYMENT_METHODS.banking,
    vnpay: typeof v.vnpay === 'boolean' ? v.vnpay : DEFAULT_PAYMENT_METHODS.vnpay,
    momo: typeof v.momo === 'boolean' ? v.momo : DEFAULT_PAYMENT_METHODS.momo,
  };
}

export async function GET() {
  try {
    await dbConnect();
    const doc: any = (await AppSetting.findOne({ key: 'singleton' }).lean()) || null;
    const paymentMethods = sanitizePaymentMethods(doc?.paymentMethods);
    return NextResponse.json({ paymentMethods }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error('Payment methods API error:', error);
    return NextResponse.json({ paymentMethods: DEFAULT_PAYMENT_METHODS }, { status: 500 });
  }
}
