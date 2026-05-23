"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/card";
import { formatEuro } from "../../lib/formatPrice";

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
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Resoconti chat concluse</h2>
        <p className="text-sm font-semibold text-emerald-400">
          Guadagno totale: {formatEuro(totalRevenue)}
        </p>
      </div>

      <div className="grid gap-4">
        {chats.map((report: ReportEntry) => (
          <Card key={report.id} className="space-y-4">
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-xs text-muted">Chat {report.chatId?.slice(-6)}</p>
              <p className="text-sm font-semibold text-emerald-400">
                Totale chat: {formatEuro(report.total)}
              </p>
            </div>

            <div className="grid gap-2">
              {report.products.map((product, index) => (
                <div
                  key={`${report.id}-${product.productId}-${index}`}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/20 flex-shrink-0">
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
                    <div className="min-w-0">
                      <p className="text-sm font-semibold break-words">{product.name || "Prodotto"}</p>
                      <p className="text-xs text-muted">Quantita: {product.quantity}</p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-400">
                    {formatEuro(product.priceAtSale * product.quantity)}
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
