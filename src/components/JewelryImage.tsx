import React, { useEffect, useRef, useState } from 'react';
import { Gem } from 'lucide-react';

interface JewelryImageProps {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export function JewelryImage({ src, alt, className = '', priority = false }: JewelryImageProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#E8DDCC] via-[#EFE6D8] to-[#DFD1BC] text-[#8E6E30] p-6 text-center ${className}`}
      >
        <Gem className="w-8 h-8 mb-2 opacity-65 stroke-[1.25]" />
        <span className="font-serif text-sm tracking-wide text-[#252525]/75 max-w-[18ch] line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#E8DDCC] ${className}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
}
