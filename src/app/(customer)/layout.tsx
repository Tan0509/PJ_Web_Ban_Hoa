import { redirect } from 'next/navigation';
import { getSessionForAppRouter } from '@/lib/authHelpers';
import CustomerLayoutClient from '@/components/customer/CustomerLayoutClient';
import { serializeForClient } from '@/lib/serializeForClient';
import { connectMongo } from '@/lib/mongoose';
import Category from '@/models/Category';

async function getCategories() {
  try {
    await connectMongo();
    const cats = await Category.find({ active: { $ne: false } })
      .select('name slug icon order active')
      .sort({ order: 1, name: 1 })
      .lean();
    return cats;
  } catch {
    return [];
  }
}

// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  // AUTH REFACTOR: Get role from NextAuth session (source of truth)
  const session = await getSessionForAppRouter();
  const role = (session?.user as { role?: string } | undefined)?.role || 'guest';
  
  // Redirect admin/staff to admin panel
  if (role === 'admin' || role === 'staff') {
    redirect('/admin');
  }

  const categories = await getCategories();

  return (
    <div className="bg-white min-h-screen flex flex-col" data-layout="customer">
      <CustomerLayoutClient categories={serializeForClient(categories)}>
        {children}
      </CustomerLayoutClient>
    </div>
  );
}
