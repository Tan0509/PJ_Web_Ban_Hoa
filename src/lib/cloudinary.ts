import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export default cloudinary;

export function isCloudinaryConfigured(): boolean {
  return !!(cloudName && apiKey && apiSecret);
}

/**
 * Upload base64 image to Cloudinary
 * @param base64String - Data URI (e.g. "data:image/jpeg;base64,/9j/4AAQ...")
 * @param folder - Cloudinary folder (e.g. "products")
 * @returns Cloudinary URL
 */
export async function uploadBase64ToCloudinary(
  base64String: string,
  folder: string = 'products'
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary chưa cấu hình. Thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET vào .env.local'
    );
  }
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder,
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Max size 1200x1200
        { quality: 'auto:good' }, // Auto quality optimization
        { fetch_format: 'auto' }, // Auto format (WebP for modern browsers)
      ],
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID (extracted from URL)
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
}

/**
 * Extract Cloudinary public ID from URL
 * @param url - Cloudinary URL
 * @returns Public ID
 */
export function getPublicIdFromUrl(url: string): string {
  // Example: https://res.cloudinary.com/demo/image/upload/v1234/products/abc.jpg
  // → products/abc
  const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return matches?.[1] || '';
}
