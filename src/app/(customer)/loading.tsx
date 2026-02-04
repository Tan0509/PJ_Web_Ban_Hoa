/**
 * Hiển thị ngay khi điều hướng giữa các trang customer.
 * Skeleton shimmer nhẹ, nền trắng, thẩm mỹ.
 */
export default function CustomerLoading() {
  return (
    <div className="bg-white min-h-screen flex flex-col" aria-hidden>
      <div className="border-b border-gray-100 bg-white">
        <div className="container-section py-4 flex items-center justify-between gap-4">
          <div className="h-10 w-32 rounded-lg skeleton-shimmer" />
          <div className="hidden md:flex gap-6">
            <div className="h-5 w-24 rounded-lg skeleton-shimmer" />
            <div className="h-5 w-24 rounded-lg skeleton-shimmer" />
          </div>
          <div className="h-10 w-28 rounded-lg skeleton-shimmer" />
        </div>
      </div>
      <div className="flex-1 container-section py-8 bg-white">
        <div className="h-10 w-56 rounded-lg skeleton-shimmer mb-8 mx-auto max-w-full" />
        <div className="h-48 sm:h-56 rounded-xl skeleton-shimmer mb-10 max-w-full" />
        <div className="flex gap-4 mb-10 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-shrink-0 w-48 h-48 rounded-full skeleton-shimmer-brand" />
          ))}
        </div>
        <div className="h-7 w-52 rounded-lg skeleton-shimmer mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/4] rounded-xl skeleton-shimmer" />
              <div className="h-4 w-3/4 rounded-lg skeleton-shimmer" />
              <div className="h-5 w-1/2 rounded-lg skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
