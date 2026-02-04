import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import BankingAccount from '@/models/BankingAccount';
import { isAdminFromSession } from '@/lib/authHelpers';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

type ErrorResponse = { message: string };

// Allow larger base64 QR image payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// Admin-only Banking Accounts management
// Scope: Admin Settings → Banking
// JSON response only – no redirect

function normalizeAccountNo(v: any) {
  return String(v || '').replace(/\s+/g, '').trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();

  if (req.method === 'GET') {
    const items = await BankingAccount.find({}).sort({ isDefault: -1, createdAt: -1 }).lean();
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { label, bankId, bankName, accountNo, accountName, qrImageDataUrl, note, isDefault, active } = req.body || {};
    const errors: string[] = [];
    if (!bankName || !String(bankName).trim()) errors.push('Thiếu tên ngân hàng');
    if (!accountNo || !normalizeAccountNo(accountNo)) errors.push('Thiếu số tài khoản');
    if (!accountName || !String(accountName).trim()) errors.push('Thiếu tên chủ tài khoản');
    const qrStr = String(qrImageDataUrl || '').trim();
    if (!qrStr) errors.push('Thiếu ảnh QR');
    // Chấp nhận URL Cloudinary hoặc base64 data URL (legacy)
    if (qrStr && !qrStr.startsWith('data:image/') && !qrStr.startsWith('http')) errors.push('Ảnh QR phải là URL hoặc file ảnh hợp lệ');
    if (errors.length) return res.status(400).json({ message: errors[0] });

    const payload: any = {
      label: label ? String(label).trim() : undefined,
      bankId: bankId ? String(bankId).trim() : undefined,
      bankName: String(bankName).trim(),
      accountNo: normalizeAccountNo(accountNo),
      accountName: String(accountName).trim(),
      qrImageDataUrl: qrStr,
      note: note ? String(note).trim() : undefined,
      isDefault: !!isDefault,
      active: typeof active === 'boolean' ? active : true,
    };

    const created: any = await BankingAccount.create(payload);

    // Ensure single default
    if (created.isDefault) {
      await BankingAccount.updateMany({ _id: { $ne: created._id } }, { $set: { isDefault: false } });
    } else {
      // If no default exists yet, auto-set first record as default
      const hasDefault = await BankingAccount.exists({ isDefault: true });
      if (!hasDefault) {
        await BankingAccount.updateOne({ _id: created._id }, { $set: { isDefault: true } });
        created.isDefault = true;
      }
    }

    return res.status(201).json({ item: created });
  }

  return methodNotAllowed(res);
}

