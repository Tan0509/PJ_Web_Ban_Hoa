import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import BankingAccount from '@/models/BankingAccount';
import { isAdminFromSession } from '@/lib/authHelpers';
import { getPublicIdFromUrl, deleteFromCloudinary } from '@/lib/cloudinary';
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

function normalizeAccountNo(v: any) {
  return String(v || '').replace(/\s+/g, '').trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();

  const { id } = req.query as { id: string };

  if (req.method === 'PATCH') {
    const { label, bankId, bankName, accountNo, accountName, qrImageDataUrl, note, isDefault, active } = req.body || {};
    const payload: any = {};
    if (label !== undefined) payload.label = label ? String(label).trim() : '';
    if (bankId !== undefined) payload.bankId = bankId ? String(bankId).trim() : '';
    if (bankName !== undefined) payload.bankName = String(bankName || '').trim();
    if (accountNo !== undefined) payload.accountNo = normalizeAccountNo(accountNo);
    if (accountName !== undefined) payload.accountName = String(accountName || '').trim();
    if (qrImageDataUrl !== undefined) payload.qrImageDataUrl = String(qrImageDataUrl || '');
    if (note !== undefined) payload.note = note ? String(note).trim() : '';
    if (typeof isDefault === 'boolean') payload.isDefault = isDefault;
    if (typeof active === 'boolean') payload.active = active;

    // Minimal validation if fields are being changed
    if (payload.bankName !== undefined && !payload.bankName) return res.status(400).json({ message: 'Thiếu tên ngân hàng' });
    if (payload.accountNo !== undefined && !payload.accountNo) return res.status(400).json({ message: 'Thiếu số tài khoản' });
    if (payload.accountName !== undefined && !payload.accountName) return res.status(400).json({ message: 'Thiếu tên chủ tài khoản' });
    // Chấp nhận URL Cloudinary hoặc base64 data URL (legacy)
    if (payload.qrImageDataUrl !== undefined && payload.qrImageDataUrl && typeof payload.qrImageDataUrl === 'string') {
      const v = payload.qrImageDataUrl.trim();
      if (v && !v.startsWith('data:image/') && !v.startsWith('http')) {
        return res.status(400).json({ message: 'Ảnh QR phải là URL hoặc file ảnh hợp lệ' });
      }
    }

    const updated: any = await BankingAccount.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });

    if (payload.isDefault === true) {
      await BankingAccount.updateMany({ _id: { $ne: updated._id } }, { $set: { isDefault: false } });
    }

    return res.status(200).json({ item: updated });
  }

  if (req.method === 'DELETE') {
    const doc: any = await BankingAccount.findById(id).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const qrUrl = doc?.qrImageDataUrl;
    if (typeof qrUrl === 'string') {
      const publicId = getPublicIdFromUrl(qrUrl);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (e) {
          console.error('Cloudinary delete image error:', e);
        }
      }
    }
    await BankingAccount.findByIdAndDelete(id);

    // Ensure there is still a default account
    const hasDefault = await BankingAccount.exists({ isDefault: true });
    if (!hasDefault) {
      const newest: any = await BankingAccount.findOne({}).sort({ createdAt: -1 });
      if (newest) {
        newest.isDefault = true;
        await newest.save();
      }
    }

    return res.status(200).json({ message: 'Deleted' });
  }

  return methodNotAllowed(res);
}

