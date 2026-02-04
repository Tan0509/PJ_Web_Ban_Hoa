import { NextResponse } from 'next/server';
import { json500 } from '@/lib/helpers/apiResponse';
import { connectMongo } from '@/lib/mongoose';
import AppSetting, { ProductFilterSetting } from '@/models/AppSetting';

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

function publicizeFilters(filters: ProductFilterSetting) {
  return {
    types: {
      enabled: !!filters?.types?.enabled,
      items: (filters?.types?.items || []).filter((x) => x?.enabled).map((x) => ({ id: x.id, label: x.label })),
    },
    colors: {
      enabled: !!filters?.colors?.enabled,
      items: (filters?.colors?.items || []).filter((x) => x?.enabled).map((x) => ({ id: x.id, label: x.label })),
    },
  };
}

export async function GET() {
  try {
    await connectMongo();
    const doc: any = (await AppSetting.findOne({ key: 'singleton' }).lean()) || null;
    const filters: ProductFilterSetting = (doc?.productFilters || DEFAULT_FILTERS) as any;
    return NextResponse.json(
      { success: true, data: publicizeFilters(filters) },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    return json500(err);
  }
}

