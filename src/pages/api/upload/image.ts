import type { NextApiRequest, NextApiResponse } from 'next';
import { uploadBase64ToCloudinary } from '@/lib/cloudinary';
import { isAdminFromSession } from '@/lib/authHelpers';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

type SuccessResponse = { url: string };
type ErrorResponse = { error: string };

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow large base64 images
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, 'error');
  }

  // Only admin can upload
  if (!(await isAdminFromSession(req, res))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { image, folder } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid image data' });
    }

    // Upload to Cloudinary
    const url = await uploadBase64ToCloudinary(image, folder || 'products');

    return res.status(200).json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    console.error('Upload image error:', error);
    return res.status(500).json({ error: message });
  }
}
