"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { addCartItem } from "../../lib/shop/cart";
import { formatEuro } from "../../lib/formatPrice";
import type { ShopProduct, ShopProductOption } from "./ShopClient";

type ProductMedia = {
  type: "image" | "video";
  url: string;
};

function getImages(product: ShopProduct) {
  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    return product.imageUrls;
  }
  if (product.imageUrl) return [product.imageUrl];
  return [];
}

function getPurchaseOptions(product: ShopProduct): ShopProductOption[] {
  if (Array.isArray(product.options) && product.options.length > 0) {
    return product.options;
  }

  return [
    {
      id: "",
      name: product.name,
      quantity: "",
      price: product.price
    }
  ];
}

export default function ProductDetailClient({ product }: { product: ShopProduct }) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const media = useMemo<ProductMedia[]>(() => {
    const images = getImages(product).map((url) => ({ type: "image" as const, url }));
    const video = product.videoUrl ? [{ type: "video" as const, url: product.videoUrl }] : [];
    return [...images, ...video];
  }, [product]);

  const options = getPurchaseOptions(product);
  const activeMedia = media[activeIndex] ?? null;

  const goToMedia = (direction: -1 | 1) => {
    if (media.length < 2) return;
    setActiveIndex((current) => (current + direction + media.length) % media.length);
  };

  const handleAdd = (option: ShopProductOption) => {
    addCartItem(product._id, option.id || undefined, 1);
    setStatus(`${option.name || product.name} aggiunto al carrello.`);
  };

  return (
    <section className="pb-16">
      <div className="mb-5 flex justify-start">
        <Button type="button" variant="outline" onClick={() => router.back()} aria-label="Torna indietro" className="p-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
      </div>

      <div className="grid gap-6">
        <div className="relative mx-auto flex w-full max-w-2xl items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/5 aspect-square sm:aspect-[4/3]">
          {activeMedia?.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeMedia.url}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : null}
          {activeMedia?.type === "video" ? (
            <video
              controls
              className="absolute inset-0 h-full w-full object-contain"
              src={activeMedia.url}
            />
          ) : null}
          {!activeMedia ? (
            <p className="text-sm text-muted">Nessun media disponibile.</p>
          ) : null}

          {media.length ? (
            <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-sm font-semibold text-fog">
              {activeIndex + 1}/{media.length}
            </div>
          ) : null}

          {media.length > 1 ? (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3 rounded-full border border-white/10 bg-black/60 p-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => goToMedia(-1)}
                aria-label="Media precedente"
              >
                {"<"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => goToMedia(1)}
                aria-label="Media successivo"
              >
                {">"}
              </Button>
            </div>
          ) : null}
        </div>

        <Card>
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Prodotto</p>
          <h1 className="mt-3 text-2xl font-semibold">{product.name}</h1>
          <p className="mt-3 text-sm text-muted">{product.description}</p>
        </Card>

        <Card>
          <div className="grid gap-3">
            {options.map((option) => (
              <div
                key={option.id || product._id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{option.name || product.name}</p>
                  <p className="text-sm text-muted">
                    {option.quantity ? `${option.quantity} - ` : ""}
                    {formatEuro(option.price)}
                  </p>
                </div>
                <Button type="button" onClick={() => handleAdd(option)} aria-label="Aggiungi al carrello" className="p-2">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
          {status ? <p className="mt-4 text-sm text-ember">{status}</p> : null}
        </Card>
      </div>
    </section>
  );
}
