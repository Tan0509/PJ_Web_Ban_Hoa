/**
 * Vietnamese phone: 10 or 11 digits starting with 0 (e.g. 0912345678, 08412345678).
 */
export function isValidVietnamesePhone(phone?: string): boolean {
  if (!phone) return false;
  return /^0\d{9,10}$/.test(phone);
}
