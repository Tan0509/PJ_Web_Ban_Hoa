const mockCategoryProducts = [
  { category: 'Bó hoa', products: [{ name: 'Bó hoa hồng đỏ', price: 450000 }] },
  { category: 'Giỏ hoa', products: [{ name: 'Giỏ hoa tươi', price: 650000 }] },
];

export default function CategoryProductsSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 uppercase">Sản phẩm theo danh mục</h2>
      <div className="space-y-6">
        {mockCategoryProducts.map((group) => (
          <div key={group.category} className="space-y-3">
            <div className="text-lg font-semibold text-[#0f5c5c]">{group.category}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.products.map((p) => (
                <div key={p.name} className="border rounded-lg p-4 bg-white shadow-sm flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{p.name}</div>
                  <div className="font-bold text-gray-900">{p.price.toLocaleString('vi-VN')} VNĐ</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
