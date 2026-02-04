import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';
import FaviconLoader from '@/components/FaviconLoader';
import ThemeInit from '@/components/ThemeInit';
import { StoreProvider } from '@/components/customer/StoreProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <ThemeInit />
        <FaviconLoader />
        <ToastProvider>
          <StoreProvider>
            {children}
          </StoreProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

