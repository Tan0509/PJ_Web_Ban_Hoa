import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AppSetting from '@/models/AppSetting';

export const runtime = 'nodejs';
export async function GET() {
  try {
    await dbConnect();
    const setting = await AppSetting.findOne({ key: 'singleton' });
    return NextResponse.json({ favicon: setting?.favicon || null });
  } catch (error: any) {
    console.error('Favicon API error:', error);
    return NextResponse.json({ favicon: null }, { status: 500 });
  }
}
