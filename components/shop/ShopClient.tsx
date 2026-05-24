"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { encryptMessage } from "../../lib/crypto/client";
import {
  addCartItem,
  cartItemKey,
  CART_UPDATED_EVENT,
  clearCartItems,
  readCartItems,
  type CartItem
} from "../../lib/shop/cart";
import { formatEuro } from "../../lib/formatPrice";

export type ShopProductOption = {
  id: string;
  name: string;
  quantity: string;
  price: number;
};

export type ShopProduct = {
  _id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string | null;
  options: ShopProductOption[];
  imageUrls: string[];
  imageUrl?: string;
  videoUrl?: string;
};

export type ShopCategory = {
  id: string;
  name: string;
};

type CartLine = {
  key: string;
  productId: string;
  optionId: string | undefined;
  productName: string;
  optionName: string;
  optionQuantity: string;
  unitPrice: number;
  quantity: number;
  total: number;
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

function getMinPrice(product: ShopProduct): number {
  const options = getPurchaseOptions(product);
  return Math.min(...options.map((opt) => opt.price));
}

export default function ShopClient({
  products,
  categories,
  ownerPublicKey
}: {
  products: ShopProduct[];
  categories: ShopCategory[];
  ownerPublicKey: string;
}) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [activeIndexes, setActiveIndexes] = useState<Record<string, number>>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    const syncCart = () => setCartItems(readCartItems());
    syncCart();
    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

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

  const visibleProducts = useMemo(() => {
    if (!activeCategoryId) return products;
    return products.filter((product) => product.categoryId === activeCategoryId);
  }, [activeCategoryId, products]);

  const activeCategoryName =
    categories.find((category) => category.id === activeCategoryId)?.name ?? "Tutti i prodotti";

  const productMap = useMemo(
    () => new Map(products.map((product) => [product._id, product] as const)),
    [products]
  );

  const cartLines = useMemo<CartLine[]>(() => {
    return cartItems
      .map((item) => {
        const product = productMap.get(item.productId);
        if (!product) return null;
        const option =
          getPurchaseOptions(product).find((candidate) => candidate.id === (item.optionId ?? "")) ??
          getPurchaseOptions(product)[0];
        if (!option) return null;
        const total = option.price * item.quantity;
        return {
          key: cartItemKey(item),
          productId: product._id,
          optionId: option.id || undefined,
          productName: product.name,
          optionName: option.name || product.name,
          optionQuantity: option.quantity,
          unitPrice: option.price,
          quantity: item.quantity,
          total
        };
      })
      .filter((line): line is CartLine => Boolean(line));
  }, [cartItems, productMap]);

  const totalPrice = useMemo(() => {
    return cartLines.reduce((sum, line) => sum + line.total, 0);
  }, [cartLines]);

  const handleQuantity = (productId: string, optionId: string | undefined, delta: number) => {
    addCartItem(productId, optionId, delta);
    setCartItems(readCartItems());
  };

  const handleSubmit = async () => {
    setStatus(null);
    if (hasPendingRequest) {
      setStatus("Hai gia una richiesta in attesa. Attendi che venga gestita.");
      return;
    }

    const selected = cartLines.map((line) => ({
      productId: line.productId,
      optionId: line.optionId,
      quantity: line.quantity
    }));

    if (!selected.length) {
      setStatus("Aggiungi almeno un prodotto al carrello.");
      return;
    }

    setLoading(true);

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
      clearCartItems();
      setCartItems([]);
      setMessage("");
    } catch {
      setStatus("Errore crittografico: richiesta non inviata.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <div className="mb-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            aria-expanded={categoryOpen}
            onClick={() => setCategoryOpen(!categoryOpen)}
          >
            {activeCategoryName}
          </Button>
          
          {categoryOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/70"
                onClick={() => setCategoryOpen(false)}
              />
              <div className="fixed top-1/2 left-1/2 z-50 w-80 max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-black p-4 shadow-2xl">
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-white hover:bg-white/10 transition"
                  onClick={() => {
                    setActiveCategoryId(null);
                    setCategoryOpen(false);
                  }}
                >
                  Tutti i prodotti
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-white hover:bg-white/10 transition"
                    onClick={() => {
                      setActiveCategoryId(category.id);
                      setCategoryOpen(false);
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {visibleProducts.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nessun prodotto in questa categoria.</p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {visibleProducts.map((product) => {
              const images = getImages(product);
              const activeIndex = activeIndexes[product._id] ?? 0;
              const activeImage = images[activeIndex] ?? images[0] ?? "";
              const firstOption = getPurchaseOptions(product)[0];

              return (
                <Link
                  key={product._id}
                  href={`/user/products/${product._id}`}
                  className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60"
                >
                  <Card className="flex h-full cursor-pointer flex-col transition hover:-translate-y-1 hover:border-white/20">
                    <div className="mb-4 h-40 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
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
                    <p className="mt-2 line-clamp-3 text-sm text-muted">{product.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="font-semibold">Da {formatEuro(getMinPrice(product))}</span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted">
                        Apri
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Card className="sticky top-10 h-fit">
        <h3 className="text-lg font-semibold">Carrello</h3>
        <div className="mt-4 space-y-4">
          {cartLines.length ? (
            <div className="space-y-3">
              {cartLines.map((line) => (
                <div
                  key={line.key}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{line.optionName}</p>
                      <p className="text-xs text-muted">
                        {line.optionQuantity ? `${line.optionQuantity} - ` : ""}
                        {formatEuro(line.unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatEuro(line.total)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantity(line.productId, line.optionId, -1)}
                    >
                      -
                    </Button>
                    <span className="min-w-6 text-center text-sm">{line.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantity(line.productId, line.optionId, 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-muted">
              Il carrello e vuoto.
            </p>
          )}
          <Input
            label="Messaggio personalizzato"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Dettagli, preferenze, urgenze..."
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Totale</span>
            <span className="font-semibold">{formatEuro(totalPrice)}</span>
          </div>
          {status ? <p className="text-sm text-ember">{status}</p> : null}
          <Button onClick={handleSubmit} disabled={loading}>
            Invia richiesta
          </Button>
        </div>
      </Card>
    </div>
  );
}
