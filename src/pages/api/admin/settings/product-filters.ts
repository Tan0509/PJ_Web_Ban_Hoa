import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import AppSetting, { ProductFilterSetting } from '@/models/AppSetting';
import { isAdminFromSession } from '@/lib/authHelpers';

type ErrorResponse = { message: string };

const DEFAULT_FILTERS: ProductFilterSetting = {
  types: {
    enabled: true,
    items: [
      { id: 'type-bo-hoa', label: 'Bó hoa', enabled: true },
      { id: 'type-gio-hoa', label: 'Giỏ hoa', enabled: true },
      { id: 'type-hop-hoa', label: 'Hộp hoa', enabled: true },
      { id: 'type-hoa-cuoi', label: 'Hoa cưới', enabled: true },
      { id: 'type-hoa-chuc-mung', label: 'Hoa chúc mừng', enabled: true },
    ],
  },
  colors: {
    enabled: true,
    items: [
      { id: 'color-do', label: 'Đỏ', enabled: true },
      { id: 'color-hong', label: 'Hồng', enabled: true },
      { id: 'color-trang', label: 'Trắng', enabled: true },
      { id: 'color-vang', label: 'Vàng', enabled: true },
      { id: 'color-xanh', label: 'Xanh', enabled: true },
      { id: 'color-tim', label: 'Tím', enabled: true },
    ],
  },
};

function sanitizeFilters(input: any): ProductFilterSetting {
  const safeGroup = (g: any, fallback: any) => {
    const enabled = typeof g?.enabled === 'boolean' ? g.enabled : fallback.enabled;
    const itemsRaw = Array.isArray(g?.items) ? g.items : fallback.items;
    const items = itemsRaw
      .map((it: any, idx: number) => {
        const id = String(it?.id || `${fallback.items?.[idx]?.id || 'item'}-${idx}`).trim();
        const label = String(it?.label || '').trim();
        const itemEnabled = typeof it?.enabled === 'boolean' ? it.enabled : true;
        if (!id || !label) return null;
        return { id, label, enabled: itemEnabled };
      })
      .filter(Boolean) as any[];
    return { enabled, items };
  };

  return {
    types: safeGroup(input?.types, DEFAULT_FILTERS.types),
    colors: safeGroup(input?.colors, DEFAULT_FILTERS.colors),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ErrorResponse>) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();

  if (req.method === 'GET') {
    const doc: any = (await AppSetting.findOne({ key: 'singleton' }).lean()) || null;
    const filters = sanitizeFilters(doc?.productFilters || DEFAULT_FILTERS);
    return res.status(200).json({ filters });
  }

  if (req.method === 'PUT') {
    const filters = sanitizeFilters((req.body || {}).filters);
    const updated = await AppSetting.findOneAndUpdate(
      { key: 'singleton' },
      { $set: { productFilters: filters } },
      { upsert: true, new: true }
    ).lean<{ productFilters?: ProductFilterSetting } | null>();
    return res.status(200).json({ filters: sanitizeFilters(updated?.productFilters || filters) });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

