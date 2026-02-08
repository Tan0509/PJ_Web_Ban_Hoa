import { NextResponse } from 'next/server';
import { getSessionForAppRouter } from '@/lib/authHelpers';
import { json500 } from '@/lib/helpers/apiResponse';
import { rebuildHomeCategoryCache } from '@/lib/data/homeCategoryCache';

export const runtime = 'nodejs';

function isAdminRole(role?: string) {
  return role === 'admin' || role === 'staff';
}

export async function POST() {
  try {
    const session = await getSessionForAppRouter();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!isAdminRole(role)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const result = await rebuildHomeCategoryCache();
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return json500(err);
  }
}
