import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  salePrice?: number;
  saleInputType?: 'amount' | 'percent'; // Cách nhập giảm giá (admin): số tiền giảm hay %
  saleInputValue?: number; // Giá trị: số tiền giảm (nếu amount) hoặc % (nếu percent)
  images: string[];
  description?: string;
  categoryId?: string; // legacy
  categoryIds?: string[]; // nhiều danh mục
  categorySlug?: string;
  colors?: string[];
  flowerTypes?: string[];
  stock: number;
  status?: 'active' | 'inactive' | 'out_of_stock';
  active: boolean;
  slug?: string;
  isFeatured?: boolean;
  soldCount?: number;
  metaTitle?: string;
  metaDescription?: string;
  note?: string; // Lưu ý sản phẩm (quản lý từ admin panel)
  specialOffers?: string; // Ưu đãi đặc biệt (quản lý từ admin panel)
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    salePrice: { type: Number },
    saleInputType: { type: String, enum: ['amount', 'percent'] },
    saleInputValue: { type: Number },
    images: [{ type: String }],
    description: { type: String },
    categoryId: { type: String },
    categoryIds: [{ type: String }],
    categorySlug: { type: String },
    colors: [{ type: String }],
    flowerTypes: [{ type: String }],
    stock: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive', 'out_of_stock'], default: 'active' },
    active: { type: Boolean, default: true },
    slug: { type: String },
    isFeatured: { type: Boolean, default: false },
    soldCount: { type: Number, default: 0 },
    metaTitle: { type: String },
    metaDescription: { type: String },
    note: { type: String }, // Lưu ý sản phẩm
    specialOffers: { type: String }, // Ưu đãi đặc biệt
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'products' }
);

// Performance indexes for customer-facing queries
// Compound indexes with 'active' first for efficient filtering
ProductSchema.index({ active: 1, slug: 1 }); // Product detail page: findOne({ slug, active: true })
ProductSchema.index({ active: 1, categorySlug: 1, createdAt: -1 }); // Category page: filter by categorySlug + sort by createdAt (newest)
ProductSchema.index({ active: 1, categorySlug: 1, salePrice: 1, price: 1 }); // Category page: filter by categorySlug + sort by price (asc/desc)
ProductSchema.index({ active: 1, categorySlug: 1, soldCount: -1 }); // Category page: filter by categorySlug + sort by soldCount (popular)
ProductSchema.index({ active: 1, categoryId: 1, createdAt: -1 }); // Category page filter (legacy) + sort
ProductSchema.index({ active: 1, categoryIds: 1, createdAt: -1 }); // Category page filter (multi-category) + sort - MongoDB auto multikey
ProductSchema.index({ active: 1, isFeatured: -1, soldCount: -1, createdAt: -1 }); // Home page featured products: filter + sort
ProductSchema.index({ active: 1, soldCount: -1, createdAt: -1 }); // Home page featured products: sort without isFeatured filter
ProductSchema.index({ active: 1, createdAt: -1 }); // Home page category products, search page: general sort by newest
ProductSchema.index({ active: 1, name: 1 }); // Search page: filter by name regex (supports prefix matching)

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
