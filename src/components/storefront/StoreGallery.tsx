import { useState } from "react";
import { X } from "lucide-react";

interface GalleryImage {
  url: string;
  caption?: string;
}

const StoreGallery = ({
  images,
  accent,
  heading,
}: {
  images: GalleryImage[] | null | undefined;
  accent: string;
  heading?: string;
}) => {
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  if (!images?.length) return null;

  return (
    <section className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-5">
          <span className="inline-block h-1 w-12 rounded-full mb-3" style={{ background: accent }} />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            {heading || "גלריה"}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightbox(img)}
              className="group relative aspect-square rounded-xl overflow-hidden border bg-muted focus:outline-none focus-visible:ring-2"
              style={{ borderColor: `${accent}33` }}
            >
              <img
                src={img.url}
                alt={img.caption || `תמונה ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.caption}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.caption || "תמונה"}
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          {lightbox.caption && (
            <p className="absolute bottom-6 text-white/80 text-sm">{lightbox.caption}</p>
          )}
        </div>
      )}
    </section>
  );
};

export default StoreGallery;
