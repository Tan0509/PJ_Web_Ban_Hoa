'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import CustomerHeader from './Header';
import SessionProviderWrapper from './SessionProviderWrapper';
import { StoreProvider } from './StoreProvider';

// Dynamic import Footer to reduce initial bundle size (below-the-fold content)
const CustomerFooter = dynamic(() => import('./Footer'), {
  ssr: true, // Footer can be server-rendered
});

type Props = {
  categories: any[];
  children: React.ReactNode;
};

export default function CustomerLayoutClient({ categories, children }: Props) {
  return (
    <SessionProviderWrapper>
      <StoreProvider>
        <Suspense
          fallback={
            <header className="bg-white shadow-sm">
              <div className="container-section py-4">
                <div className="h-20 bg-gray-100 animate-pulse rounded" />
              </div>
            </header>
          }
        >
          <CustomerHeader categories={categories} />
        </Suspense>
        <Suspense fallback={<main className="flex-1"><div className="container-section py-10"><div className="h-96 bg-gray-100 animate-pulse rounded" /></div></main>}>
          <main className="flex-1">{children}</main>
        </Suspense>
        <CustomerFooter />
      </StoreProvider>
    </SessionProviderWrapper>
  );
}
