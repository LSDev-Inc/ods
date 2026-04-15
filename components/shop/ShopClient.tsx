"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { encryptMessage } from "../../lib/crypto/client";

export type ShopProduct = {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrls: string[];
  imageUrl?: string;
  videoUrl?: string;
};

export default function ShopClient({
  products,
  ownerPublicKey
}: {
  products: ShopProduct[];
  ownerPublicKey: string;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [activeIndexes, setActiveIndexes] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryMode, setGalleryMode] = useState<"image" | "video">("image");

  const getImages = (product: ShopProduct) => {
    if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    if (product.imageUrl) return [product.imageUrl];
    return [];
  };

  const getVideo = (product: ShopProduct) => {
    if (product.videoUrl && product.videoUrl.length > 0) return product.videoUrl;
    return null;
  };

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/requests");
      if (!res.ok) return;
      const data: { status: "pending" | "accepted" | "rejected" }[] = await res.json();
      setHasPendingRequest(data.some((r) => r.status === "pending"));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!products.length) return;
    const timer = setInterval(() => {
      setActiveIndexes((prev) => {
        const next: Record<string, number> = { ...prev };
        products.forEach((product) => {
          const images = getImages(product);
          if (images.length < 2) return;
          const current = prev[product._id] ?? 0;
          next[product._id] = (current + 1) % images.length;
        });
        return next;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [products]);

  const totalPrice = useMemo(() => {
    return products.reduce((sum, product) => {
      const qty = quantities[product._id] || 0;
      return sum + product.price * qty;
    }, 0);
  }, [products, quantities]);

  const handleQuantity = (id: string, delta: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      next[id] = Math.max(0, (next[id] || 0) + delta);
      if (next[id] === 0) delete next[id];
      return next;
    });
  };

  const handleSubmit = async () => {
    setStatus(null);
    if (hasPendingRequest) {
      setStatus("Hai gia una richiesta in attesa. Attendi che venga gestita.");
      return;
    }

    setLoading(true);

    const selected = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (!selected.length) {
      setStatus("Seleziona almeno un prodotto.");
      setLoading(false);
      return;
    }

    try {
      if (!ownerPublicKey) {
        setStatus("Chiave pubblica owner non disponibile.");
        setLoading(false);
        return;
      }
      const encrypted = await encryptMessage(message || "Richiesta senza messaggio", ownerPublicKey);
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: selected,
          totalPrice,
          customMessageCiphertext: encrypted.ciphertext,
          customMessageIv: encrypted.iv,
          customMessageEncryptedSymKey: encrypted.encryptedSymKey
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data?.error ?? "Impossibile inviare la richiesta.");
        setLoading(false);
        return;
      }

      setStatus("Richiesta inviata. Attendi la conferma di un admin.");
      setQuantities({});
      setMessage("");
    } catch {
      setStatus("Errore crittografico: richiesta non inviata.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="grid gap-6 md:grid-cols-2">
        {products.map((product) => {
          const images = getImages(product);
          const videoUrl = getVideo(product);
          const activeIndex = activeIndexes[product._id] ?? 0;
          const activeImage = images[activeIndex] ?? images[0] ?? "";

          return (
            <Card key={product._id}>
              <div
                className="mb-4 h-40 overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                onClick={() => {
                  if (!images.length && !videoUrl) return;
                  setSelectedId(product._id);
                  if (images.length) {
                    setGalleryMode("image");
                    setGalleryIndex(activeIndex);
                  } else {
                    setGalleryMode("video");
                    setGalleryIndex(0);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (images.length || videoUrl)) {
                    setSelectedId(product._id);
                    if (images.length) {
                      setGalleryMode("image");
                      setGalleryIndex(activeIndex);
                    } else {
                      setGalleryMode("video");
                      setGalleryIndex(0);
                    }
                  }
                }}
              >
                {activeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                    Nessuna immagine
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold">{product.name}</h3>
              <p className="mt-2 text-sm text-muted">{product.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-semibold">EUR {product.price}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleQuantity(product._id, -1)}>
                    -
                  </Button>
                  <span className="text-sm">{quantities[product._id] || 0}</span>
                  <Button variant="outline" size="sm" onClick={() => handleQuantity(product._id, 1)}>
                    +
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="sticky top-10 h-fit">
        <h3 className="text-lg font-semibold">La tua richiesta</h3>
        <p className="mt-2 text-sm text-muted">
          Messaggio cifrato end-to-end, leggibile solo dall&apos;owner.
        </p>
        <div className="mt-4 space-y-4">
          <Input
            label="Messaggio personalizzato"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Dettagli, preferenze, urgenze..."
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Totale</span>
            <span className="font-semibold">EUR {totalPrice}</span>
          </div>
          {status ? <p className="text-sm text-ember">{status}</p> : null}
          <Button onClick={handleSubmit} disabled={loading}>
            Invia richiesta
          </Button>
        </div>
      </Card>

      {selectedId ? (() => {
        const selectedProduct = products.find((p) => p._id === selectedId);
        if (!selectedProduct) return null;
        const images = getImages(selectedProduct);
        const videoUrl = getVideo(selectedProduct);
        if (!images.length && !videoUrl) return null;
        const current = images[galleryIndex] ?? images[0];

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-6"
            onClick={() => setSelectedId(null)}
          >
            <div
              className="flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Galleria</p>
                  <h3 className="text-xl font-semibold">{selectedProduct.name}</h3>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
                  Chiudi
                </Button>
              </div>
              <div className="mt-4 grid flex-1 min-h-0 gap-4 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6 lg:grid-cols-[2fr_1fr]">
                <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3]">
                  {galleryMode === "image" && current ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current}
                      alt={selectedProduct.name}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  ) : null}
                  {galleryMode === "video" && videoUrl ? (
                    <video
                      controls
                      className="absolute inset-0 h-full w-full object-contain"
                      src={videoUrl}
                    />
                  ) : null}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-1">
                  {images.map((src, index) => (
                    <button
                      key={`${selectedProduct._id}-${index}`}
                      type="button"
                      className={`flex-shrink-0 overflow-hidden rounded-2xl border ${
                        index === galleryIndex
                          ? "border-emerald-400/70"
                          : "border-white/10"
                      } w-24 sm:w-full`}
                      onClick={() => {
                        setGalleryMode("image");
                        setGalleryIndex(index);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`${selectedProduct.name} ${index + 1}`}
                        className="h-20 w-full object-contain sm:h-24"
                      />
                    </button>
                  ))}
                  {videoUrl ? (
                    <button
                      type="button"
                      className={`flex h-20 w-24 flex-shrink-0 items-center justify-center rounded-2xl border text-sm sm:h-24 sm:w-full ${
                        galleryMode === "video" ? "border-emerald-400/70" : "border-white/10"
                      }`}
                      onClick={() => setGalleryMode("video")}
                    >
                      Video
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}
    </div>
  );
}
