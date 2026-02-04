import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import AppSetting from '@/models/AppSetting';
import type { IAppSetting } from '@/models/AppSetting';
import { getPublicIdFromUrl, deleteFromCloudinary } from '@/lib/cloudinary';
import { isAdminFromSession } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!(await isAdminFromSession(req, res))) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await dbConnect();

    if (req.method === 'GET') {
      const setting = await AppSetting.findOne({ key: 'singleton' });
      return res.status(200).json({ favicon: setting?.favicon || null });
    }

    if (req.method === 'PUT') {
      const { favicon } = req.body;
      
      if (favicon && typeof favicon !== 'string') {
        return res.status(400).json({ message: 'Invalid favicon format' });
      }

      const current = await AppSetting.findOne({ key: 'singleton' }).lean() as IAppSetting | null;
      const oldFavicon = current?.favicon;
      if (typeof oldFavicon === 'string') {
        const publicId = getPublicIdFromUrl(oldFavicon);
        if (publicId) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (e) {
            console.error('Cloudinary delete favicon error:', e);
          }
        }
      }

      const setting = await AppSetting.findOneAndUpdate(
        { key: 'singleton' },
        { favicon: favicon || null },
        { upsert: true, new: true }
      );

      return res.status(200).json({ favicon: setting.favicon || null, message: 'Favicon đã được cập nhật' });
    }
  } catch (error: any) {
    console.error('Favicon API error:', error);
    return res.status(500).json({ message: error?.message || 'Internal server error' });
  }
}
