import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import AppSetting from '@/models/AppSetting';
import { isAdminFromSession } from '@/lib/authHelpers';

type ErrorResponse = { message: string };

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

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();

  if (req.method === 'GET') {
    const doc: any = (await AppSetting.findOne({ key: 'singleton' }).lean()) || null;
    const paymentMethods = sanitizePaymentMethods(doc?.paymentMethods);
    return res.status(200).json({ paymentMethods });
  }

  if (req.method === 'PUT') {
    const { paymentMethods } = req.body || {};
    const sanitized = sanitizePaymentMethods(paymentMethods);

    // Validate: ít nhất 1 payment method phải được enable
    const enabledCount = Object.values(sanitized).filter(Boolean).length;
    if (enabledCount === 0) {
      return res.status(400).json({ message: 'Vui lòng bật ít nhất một phương thức thanh toán' });
    }

    const updated = await AppSetting.findOneAndUpdate(
      { key: 'singleton' },
      { $set: { paymentMethods: sanitized } },
      { upsert: true, new: true }
    ).lean();

    return res.status(200).json({ paymentMethods: sanitized, message: 'Đã lưu cài đặt phương thức thanh toán' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
