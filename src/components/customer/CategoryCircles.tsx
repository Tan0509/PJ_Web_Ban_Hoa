import Link from 'next/link';
import Image from 'next/image';

type Category = {
  _id?: string;
  name: string;
  slug?: string;
  icon?: string;
  iconUrl?: string;
};

interface Props {
  categories: Category[];
  hasMore: boolean;
}

export default function CategoryCircles({ categories, hasMore }: Props) {
  return (
    <section className="container-section pb-12 md:pb-16">
      <div className="flex items-center gap-4 mb-8">
        <span className="flex-1 h-px bg-gray-200" />
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center whitespace-nowrap px-2">DANH MỤC SẢN PHẨM</h2>
        <span className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
        {categories.map((c) => {
          const img = c.iconUrl || c.icon;
          return (
            <div key={c._id || c.slug || c.name} className="group flex flex-col items-center gap-3">
              <div className="relative h-72 w-72 rounded-full overflow-hidden shadow-md">
                {img ? (
                  <Image
                    src={img}
                    alt={c.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 group-hover:brightness-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-500 transition-transform duration-500 ease-out group-hover:scale-105 group-hover:brightness-110">
                    {c.name}
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col justify-end pb-6 bg-gradient-to-t from-black/30 via-black/5 to-transparent text-white text-center">
                  <div className="text-xl font-semibold drop-shadow-sm">{c.name}</div>
                  <Link
                    href={`/category/${c.slug || c._id}`}
                    className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#0f5c5c] text-white text-sm font-semibold shadow mx-auto"
                  >
                    Xem ngay
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && categories.length > 0 && (
        <div className="text-center mt-8">
          <Link
            href={`/category/${categories[0].slug || categories[0]._id || ''}`}
            className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-[#0f5c5c] text-white font-semibold shadow"
          >
            Xem thêm
          </Link>
        </div>
      )}
    </section>
  );
}
