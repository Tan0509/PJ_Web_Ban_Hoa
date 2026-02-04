/**
 * Optimize Cloudinary image URL for faster load (smaller size, auto format/quality).
 * Non-Cloudinary URLs are returned unchanged.
 */
export function getOptimizedImageUrl(
  url: string | undefined | null,
  options?: { width?: number; height?: number; crop?: string }
): string {
  if (!url || typeof url !== 'string') return url || '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;

  const w = options?.width;
  const h = options?.height;
  const crop = options?.crop || 'limit'; // limit = scale down only, fill = crop
  const parts: string[] = ['q_auto', 'f_auto'];
  if (w) parts.push(`w_${w}`);
  if (h) parts.push(`h_${h}`);
  if (crop) parts.push(`c_${crop}`);
  const trans = parts.join(',');

  return url.replace('/upload/', `/upload/${trans}/`);
}
