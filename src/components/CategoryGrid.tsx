const mockCategories = [
  { name: 'Bó hoa', slug: 'bo-hoa' },
  { name: 'Giỏ hoa', slug: 'gio-hoa' },
  { name: 'Hộp hoa', slug: 'hop-hoa' },
];

export default function CategoryGrid() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 uppercase">Danh mục sản phẩm</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {mockCategories.map((c) => (
          <div key={c.slug} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="font-semibold text-lg text-[#0f5c5c]">{c.name}</div>
            <div className="text-sm text-gray-500">{c.slug}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
