'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { formatVnd } from '@/lib/helpers/format';
import { useStore } from './StoreProvider';
import ProductCard from './ProductCard';

// Dynamic import ZaloChatWidget (below-the-fold, only on product detail page)
const ZaloChatWidget = dynamic(() => import('./ZaloChatWidget'), {
  ssr: false, // Zalo widget requires client-side only (external script)
});

type Product = {
  _id?: string;
  slug?: string;
  name: string;
  price?: number;
  salePrice?: number;
  images?: string[];
  description?: string;
  metaDescription?: string;
  note?: string; // Lưu ý sản phẩm
  specialOffers?: string; // Ưu đãi đặc biệt
};

function formatCurrency(value?: number) {
  return typeof value === 'number' && !Number.isNaN(value) ? formatVnd(value) : '';
}

// UI/UX Redesign: ProductDetail with improved visual hierarchy, spacing, and modern design
export default function ProductDetail({ product, related }: { product: Product; related?: Product[] }) {
  const router = useRouter();
  const { addToCart, favorites, toggleFavorite, cart } = useStore();
  const [activeImg, setActiveImg] = useState(product.images?.[0] || '');
  const [note, setNote] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState('');
  const [mounted, setMounted] = useState(false);

  const isFavorite = useMemo(() => {
    const key = product._id?.toString?.() || product.slug || product.name;
    return favorites.some((p) => (p._id?.toString?.() || p.slug || p.name) === key);
  }, [favorites, product]);

  const cartItem = useMemo(() => {
    const key = product._id?.toString?.() || product.slug || product.name;
    return cart.find((c) => (c.product._id?.toString?.() || c.product.slug || c.product.name) === key);
  }, [cart, product]);

  const hasSale = typeof product.salePrice === 'number' && typeof product.price === 'number' && product.salePrice! < product.price!;
  const finalPrice = hasSale ? product.salePrice : product.price;
  const discountPercent = hasSale && typeof product.price === 'number' && typeof product.salePrice === 'number'
    ? Math.round(100 - (product.salePrice / product.price) * 100)
    : null;

  const gallery = product.images?.length ? product.images : [activeImg || ''];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckout = () => {
    addToCart(product, note);
    router.push('/checkout');
  };

  const handleMainImageClick = () => {
    if (activeImg) {
      setModalImage(activeImg);
      setShowImageModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowImageModal(false);
    setModalImage('');
  };

  const handleThumbnailClick = (img: string) => {
    setActiveImg(img);
  };

  return (
    <div className="container-section py-10 md:py-12 lg:py-16 space-y-12">
      {/* Main Product Section: Image + Info */}
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* 1. Product Image Gallery (Left Column) */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative w-full aspect-square overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50 shadow-lg group cursor-pointer" onClick={handleMainImageClick}>
            {activeImg ? (
              <Image
                src={activeImg}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition duration-300 group-hover:scale-105"
                priority
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400 text-lg">Không có ảnh</div>
            )}
            {/* Discount Badge (if applicable) */}
            {discountPercent && (
              <div className="absolute top-4 right-4 bg-amber-400 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg z-10">
                -{discountPercent}%
              </div>
            )}
            {/* Click hint overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </div>

          {/* Thumbnail Gallery */}
          {gallery.filter(Boolean).length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {gallery.map((img, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleThumbnailClick(img)}
                  className={`relative h-20 w-full rounded-md overflow-hidden border-2 transition-all duration-200 ${
                    activeImg === img
                      ? 'ring-2 ring-[#0f5c5c] ring-offset-2 border-[#0f5c5c] shadow-md scale-105'
                      : 'border-gray-200 hover:border-[#0f5c5c]/50 hover:scale-105'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name}-${idx}`}
                    fill
                    sizes="(max-width: 640px) 25vw, 16vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {/* MÔ TẢ CHI TIẾT (moved from right column) */}
          {product.description && (
            <div className="border-t border-gray-200 pt-6 space-y-3">
              <div className="text-sm font-semibold text-gray-800 uppercase tracking-wide">MÔ TẢ CHI TIẾT</div>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2. Product Info (Right Column) */}
        <div className="space-y-6">
          {/* Product Header: Name + Price */}
          <div className="space-y-3 pb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">{product.name}</h1>
            
            {/* Price Display with Visual Hierarchy */}
            <div className="relative flex items-baseline gap-4 pt-2">
              {hasSale && typeof product.price === 'number' && (
                <span className="text-xl text-gray-400 line-through font-medium">
                  {formatCurrency(product.price)}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-3xl md:text-4xl font-bold text-[#0f5c5c]">
                  {formatCurrency(finalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* MÔ TẢ SẢN PHẨM (mô tả ngắn) */}
          {product.metaDescription && (
            <div className="border-t border-gray-200 pt-6 space-y-3">
              <div className="text-sm font-semibold text-gray-800 uppercase tracking-wide">MÔ TẢ SẢN PHẨM</div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-base text-gray-700 leading-relaxed">
                  {product.metaDescription}
                </p>
              </div>
            </div>
          )}

          {/* Product Actions: CTA Section */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Primary CTA: Thanh toán */}
              <button
                type="button"
                onClick={handleCheckout}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f5c5c] px-6 py-3.5 text-white text-base font-bold shadow-lg hover:shadow-xl hover:bg-[#0c4d4d] transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Thanh toán ngay
              </button>

              {/* Secondary CTA: Thêm vào giỏ */}
              <button
                type="button"
                onClick={() => addToCart(product, note)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-white border-2 border-[#0f5c5c] text-[#0f5c5c] px-6 py-3.5 text-base font-semibold hover:bg-[#0f5c5c]/5 transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Thêm vào giỏ
              </button>
            </div>

            {/* Tertiary CTA: Yêu thích */}
            <button
              type="button"
              onClick={() => toggleFavorite(product)}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-base font-medium transition-all duration-200 ${
                isFavorite
                  ? 'border-[#0f5c5c] text-[#0f5c5c] bg-[#0f5c5c]/5'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 8.25c0-2.485-2.046-4.5-4.571-4.5-1.63 0-3.058.936-3.8 2.292-.742-1.356-2.17-2.292-3.8-2.292C6.304 3.75 4.25 5.765 4.25 8.25c0 4.28 7.371 9.189 8.371 9.939.25.189.58.189.83 0 1-0.75 8.371-5.659 8.371-9.939Z"
                />
              </svg>
              {isFavorite ? 'Đã yêu thích' : 'Thêm vào yêu thích'}
            </button>

            {/* Cart Status (if item already in cart) */}
            {cartItem && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-emerald-700 font-medium">
                  ✓ Đã có <strong>{cartItem.quantity}</strong> sản phẩm trong giỏ hàng
                  {cartItem.note && <span className="text-emerald-600"> • Ghi chú: {cartItem.note}</span>}
                </span>
              </div>
            )}
          </div>

          {/* Purchase Note Section */}
          <div className="border-t border-gray-200 pt-6 space-y-2">
            <label className="text-sm font-semibold text-gray-800">Ghi chú khi mua hàng (tùy chọn)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú cho đơn hàng..."
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#0f5c5c] focus:ring-2 focus:ring-[#0f5c5c]/20 resize-none transition-colors"
              rows={3}
            />
          </div>

          {/* Lưu ý Section (if exists) */}
          {product.note && (
            <div className="border-t-2 border-blue-200 pt-6 space-y-3">
              <div className="text-lg font-bold text-blue-600 uppercase tracking-wide">LƯU Ý</div>
              <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4">
                <p className="text-base text-blue-800 leading-relaxed whitespace-pre-line">{product.note}</p>
              </div>
            </div>
          )}

          {/* Ưu đãi đặc biệt Section (if exists) */}
          {product.specialOffers && (
            <div className="border-t-2 border-amber-200 pt-6 space-y-3">
              <div className="text-lg font-bold text-amber-600 uppercase tracking-wide">ƯU ĐÃI ĐẶC BIỆT</div>
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4">
                <ul className="space-y-2 text-base text-amber-800">
                  {product.specialOffers
                    .split('\n')
                    .filter((line) => line.trim())
                    .map((offer, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">•</span>
                        <span className="leading-relaxed">{offer.trim()}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products Section */}
      {related && related.length > 0 && (
        <div className="mt-16 pt-12 border-t-2 border-gray-200 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p._id || p.slug || p.name} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Zalo Chat Widget - Only visible on product detail page */}
      <ZaloChatWidget enableQuickChat={true} />

      {/* Image Modal/Lightbox */}
      {showImageModal && modalImage && mounted
        ? createPortal(
            <div
              className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999]"
              onClick={handleCloseModal}
            >
              <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
                <div className="relative w-full h-[90vh] max-w-[90vw]">
                  <Image
                    src={modalImage}
                    alt={product.name}
                    fill
                    sizes="90vw"
                    className="object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
                  aria-label="Đóng"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
