'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { getOptimizedImageUrl } from '@/lib/helpers/image';

type Poster = { _id?: string; imageUrl: string; link?: string };

interface Props {
  posters: Poster[];
}

export default function CustomerBanner({ posters }: Props) {
  const list = posters?.length ? posters : [];
  const [index, setIndex] = useState(0);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const dragRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!list.length) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % list.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [list.length]);

  if (!list.length) {
    return (
      <section className="bg-[#f5f6f8]">
        <div className="container-section py-6 md:py-8">
          <div className="relative h-48 md:h-56 w-full rounded-xl overflow-hidden bg-gradient-to-r from-pink-200 to-teal-200 flex items-center justify-center text-2xl font-semibold text-[#0f5c5c]">
            Banner
          </div>
        </div>
      </section>
    );
  }

  const current = list[index];
  const src = (current as any)?.imageUrl || (current as any)?.image || '';

  const handleDragStart = (x: number) => setDragStart(x);
  const handleDragEnd = (x: number) => {
    if (dragStart === null) return;
    const delta = x - dragStart;
    if (Math.abs(delta) > 50) {
      if (delta < 0) setIndex((prev) => (prev + 1) % list.length);
      else setIndex((prev) => (prev - 1 + list.length) % list.length);
    }
    setDragStart(null);
  };

  const ImageContent = (
    <div
      ref={dragRef}
      className="relative h-[28rem] md:h-[32rem] w-full rounded-xl overflow-hidden cursor-grab"
      onPointerDown={(e) => handleDragStart(e.clientX)}
      onPointerUp={(e) => handleDragEnd(e.clientX)}
      onPointerLeave={(e) => handleDragEnd(e.clientX)}
    >
      {src ? (
        <Image
          src={getOptimizedImageUrl(src, { width: 1200 })}
          alt="Poster"
          fill
          sizes="100vw"
          className="object-cover transition-transform duration-700 ease-in-out"
          priority
        />
      ) : (
        <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-400 text-lg">
          Poster
        </div>
      )}
    </div>
  );

  return (
    <section className="bg-white">
      <div className="container-section py-6 md:py-8">
        {current.link ? (
          <Link href={current.link} className="block">
            {ImageContent}
          </Link>
        ) : (
          ImageContent
        )}
        {list.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            {list.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${i === index ? 'bg-[#0f5c5c]' : 'bg-gray-300'}`}
                aria-label={`Chuyển đến poster ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
