import { NextResponse } from 'next/server';
import { getSessionForAppRouter } from '@/lib/authHelpers';
import { connectMongo } from '@/lib/mongoose';
import SiteVisit from '@/models/SiteVisit';

export const runtime = 'nodejs';

function isAdminRole(role?: string) {
  return role === 'admin' || role === 'staff';
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateKeyUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getVietnamDateKey(now = new Date()) {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vn = new Date(utc + 7 * 60 * 60000);
  const y = vn.getFullYear();
  const m = String(vn.getMonth() + 1).padStart(2, '0');
  const d = String(vn.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDefaultRange() {
  const today = new Date();
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const from = new Date(to);
  from.setUTCDate(to.getUTCDate() - 29);
  return { from, to };
}

function daysInclusive(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86400000) + 1;
}

export async function GET(req: Request) {
  try {
    const session = await getSessionForAppRouter();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!isAdminRole(role)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const defaults = getDefaultRange();
    const fromInput = parseDate(searchParams.get('from') || undefined) || defaults.from;
    const toInput = parseDate(searchParams.get('to') || undefined) || defaults.to;

    const from = new Date(Date.UTC(fromInput.getUTCFullYear(), fromInput.getUTCMonth(), fromInput.getUTCDate()));
    const to = new Date(Date.UTC(toInput.getUTCFullYear(), toInput.getUTCMonth(), toInput.getUTCDate()));

    if (from > to) {
      return NextResponse.json({ message: 'Invalid date range' }, { status: 400 });
    }

    const fromKey = toDateKeyUTC(from);
    const toKey = toDateKeyUTC(to);
    const todayKey = getVietnamDateKey();

    await connectMongo();

    const [rangeVisits, activeDaysRaw, todayVisits] = await Promise.all([
      SiteVisit.countDocuments({ dateKey: { $gte: fromKey, $lte: toKey } }),
      SiteVisit.distinct('dateKey', { dateKey: { $gte: fromKey, $lte: toKey } }),
      SiteVisit.countDocuments({ dateKey: todayKey }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        rangeVisits,
        activeDays: Array.isArray(activeDaysRaw) ? activeDaysRaw.length : 0,
        totalDays: daysInclusive(from, to),
        todayVisits,
      },
    });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
