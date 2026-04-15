"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/card";

type ReportProduct = {
  productId: string;
  name: string;
  imageUrl: string;
  quantity: number;
  priceAtSale: number;
};

type ReportEntry = {
  id: string;
  chatId: string;
  products: ReportProduct[];
  total: number;
};

export default function ChatReports() {
  const [chats, setChats] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const res = await fetch("/api/reports");
      if (!res.ok) return;
      const data = await res.json();
      if (!active) return;
      setChats(
        data.map((report: any) => ({
          id: report.id as string,
          chatId: report.chatId as string,
          products: report.products ?? [],
          total: report.total ?? 0
        }))
      );
      setLoading(false);
    };

    load();
    const interval = setInterval(load, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const totalRevenue = useMemo(() => {
    return chats.reduce((sum: number, report: ReportEntry) => sum + (report.total || 0), 0);
  }, [chats]);

  if (loading) {
    return <p className="text-sm text-muted">Caricamento resoconti...</p>;
  }

  if (!chats.length) {
    return <p className="text-sm text-muted">Nessun resoconto disponibile.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Resoconti chat concluse</h2>
        <p className="text-sm font-semibold text-emerald-400">
          Guadagno totale: EUR {totalRevenue.toFixed(2)}
        </p>
      </div>

      <div className="grid gap-4">
        {chats.map((report: ReportEntry) => (
          <Card key={report.id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">Chat {report.chatId?.slice(-6)}</p>
              <p className="text-sm font-semibold text-emerald-400">
                Totale chat: EUR {report.total.toFixed(2)}
              </p>
            </div>

            <div className="grid gap-2">
              {report.products.map((product, index) => (
                <div
                  key={`${report.id}-${product.productId}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                          Img
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{product.name || "Prodotto"}</p>
                      <p className="text-xs text-muted">Quantita: {product.quantity}</p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-400">
                    EUR {(product.priceAtSale * product.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
