import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Product from '@/models/Product';

export const runtime = 'nodejs';
export async function GET(req: Request) {
  await connectMongo();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const skip = Number(searchParams.get('skip')) || 0;
  const products = await Product.find({ active: true })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  return NextResponse.json({ success: true, data: products });
}

export async function POST(req: Request) {
  await connectMongo();
  const body = await req.json();
  const created = await Product.create(body);
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
