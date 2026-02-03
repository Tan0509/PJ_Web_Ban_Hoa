import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import AppSetting from '@/models/AppSetting';
import { isAdminFromSession } from '@/lib/authHelpers';

type ErrorResponse = { message: string };

function normalizeEmail(v: string) {
  return v.toLowerCase().trim();
}

function isEmail(v: string) {
  return /\S+@\S+\.\S+/.test(v);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();

  if (req.method === 'GET') {
    const doc: any = (await AppSetting.findOne({ key: 'singleton' }).lean()) || null;
    return res.status(200).json({ emails: doc?.adminOrderNotifyEmails || [] });
  }

  if (req.method === 'PUT') {
    const { emails } = req.body || {};
    const list = Array.isArray(emails) ? emails : [];
    const normalized = list
      .map((e: any) => normalizeEmail(String(e || '')))
      .filter(Boolean);

    const unique = Array.from(new Set(normalized));
    const invalid = unique.find((e) => !isEmail(e));
    if (invalid) return res.status(400).json({ message: `Email không hợp lệ: ${invalid}` });

    const updated = await AppSetting.findOneAndUpdate(
      { key: 'singleton' },
      { $set: { adminOrderNotifyEmails: unique } },
      { upsert: true, new: true }
    ).lean<{ adminOrderNotifyEmails?: string[] } | null>();

    return res.status(200).json({ emails: updated?.adminOrderNotifyEmails || [] });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

