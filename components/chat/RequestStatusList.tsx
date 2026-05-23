"use client";

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { formatEuro } from "../../lib/formatPrice";

export type RequestStatusItem = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  totalPrice: number;
  assignedAdminId: string | null;
  createdAt: string;
};

export default function RequestStatusList() {
  const [items, setItems] = useState<RequestStatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await fetch("/api/requests");
      if (!res.ok) return;
      const data = await res.json();
      if (active) {
        setItems(data);
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) return <p className="text-sm text-muted">Caricamento richieste...</p>;
  if (!items.length) return <p className="text-sm text-muted">Nessuna richiesta inviata.</p>;

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Card key={item.id} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Richiesta {item.id.slice(-6)}</p>
            <p className="text-xs text-muted">Stato: {item.status}</p>
          </div>
          <span className="text-sm">{formatEuro(item.totalPrice)}</span>
        </Card>
      ))}
    </div>
  );
}
