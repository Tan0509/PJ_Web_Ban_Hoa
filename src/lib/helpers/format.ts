/**
 * Format number as Vietnamese Dong (e.g. "1.234.567 VNĐ").
 * Null/undefined/NaN are treated as 0.
 */
export function formatVnd(value?: number | null): string {
  const n = value ?? 0;
  if (typeof n !== 'number' || Number.isNaN(n)) return (0).toLocaleString('vi-VN') + ' VNĐ';
  return n.toLocaleString('vi-VN') + ' VNĐ';
}
