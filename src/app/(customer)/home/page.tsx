import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

/**
 * Trang home: data lấy từ /api/home, cache client TTL 30p.
 * Điều hướng quay lại trong 30p → hiện cache, không gọi lại API.
 */
export default function HomePage() {
  return <HomeClient />;
}
