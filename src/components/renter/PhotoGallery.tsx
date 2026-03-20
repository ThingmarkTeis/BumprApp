"use client";

import { useState, useRef } from "react";

export default function PhotoGallery({ photos }: { photos: { url: string }[] }) {
  const [fullscreen, setFullscreen] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (photos.length === 0) {
    return (
      <div className="h-64 bg-volcanic/5 flex items-center justify-center text-volcanic/20 text-4xl">
        ⌂
      </div>
    );
  }

  return (
    <>
      {/* Mobile carousel */}
      <div className="md:hidden">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {photos.map((p, i) => (
            <div
              key={i}
              className="snap-center shrink-0 w-full"
              onClick={() => setFullscreen(i)}
            >
              <img
                src={p.url}
                alt=""
                className="w-full h-64 object-cover"
              />
            </div>
          ))}
        </div>
        {photos.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {photos.map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-volcanic/20"
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-80 rounded-xl overflow-hidden">
        {photos[0] && (
          <div
            className="col-span-2 row-span-2 cursor-pointer"
            onClick={() => setFullscreen(0)}
          >
            <img src={photos[0].url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {photos.slice(1, 5).map((p, i) => (
          <div
            key={i + 1}
            className="cursor-pointer"
            onClick={() => setFullscreen(i + 1)}
          >
            <img src={p.url} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Fullscreen overlay */}
      {fullscreen !== null && (
        <div
          className="fixed inset-0 z-50 bg-volcanic/90 flex items-center justify-center"
          onClick={() => setFullscreen(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl z-10"
            onClick={() => setFullscreen(null)}
          >
            ✕
          </button>
          <img
            src={photos[fullscreen].url}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
