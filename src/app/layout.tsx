import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';
import FaviconLoader from '@/components/FaviconLoader';
import ThemeInit from '@/components/ThemeInit';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <ThemeInit />
        <FaviconLoader />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

