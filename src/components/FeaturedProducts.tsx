const mockProducts = [
  { name: 'Bó hoa hồng đỏ', price: 450000 },
  { name: 'Bó hoa hồng trắng', price: 420000 },
];

export default function FeaturedProducts() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 uppercase">Sản phẩm nổi bật</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mockProducts.map((p) => (
          <div key={p.name} className="border rounded-lg p-4 bg-white shadow-sm flex items-center justify-between">
            <div className="font-semibold text-[#0f5c5c]">{p.name}</div>
            <div className="font-bold text-gray-900">{p.price.toLocaleString('vi-VN')} VNĐ</div>
          </div>
        ))}
      </div>
    </section>
  );
}
