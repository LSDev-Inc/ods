"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { decryptMessage } from "../../lib/crypto/client";
import { formatEuro } from "../../lib/formatPrice";
import { useKeyring } from "../KeyringProvider";

export type PendingRequest = {
  id: string;
  userId: string;
  username: string;
  products?: {
    productId: string;
    optionId: string | null;
    quantity: number;
    optionName: string;
    optionQuantity: string;
    unitPrice: number;
  }[];
  totalPrice: number;
  status: "pending" | "accepted" | "rejected";
  customMessageCiphertext: string;
  customMessageIv: string;
  customMessageEncryptedSymKey: string;
};

export default function RequestQueue() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { privateKey, identity } = useKeyring();

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/requests");
    if (!res.ok) {
      setError("Impossibile caricare le richieste.");
      setLoading(false);
      return;
    }
    const data: PendingRequest[] = await res.json();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (id: string, action: "accept" | "reject") => {
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });

    if (res.ok) {
      await load();
    }
  };

  const decryptIfPossible = async (req: PendingRequest) => {
    if (!privateKey || identity?.role !== "owner") return "Messaggio cifrato";
    try {
      return await decryptMessage(
        {
          ciphertext: req.customMessageCiphertext,
          iv: req.customMessageIv,
          encryptedSymKey: req.customMessageEncryptedSymKey
        },
        privateKey
      );
    } catch {
      return "Messaggio cifrato";
    }
  };

  if (loading) return <p className="text-sm text-muted">Caricamento richieste...</p>;
  if (error) return <p className="text-sm text-ember">{error}</p>;
  if (!requests.length) return <p className="text-sm text-muted">Nessuna richiesta in attesa.</p>;

  return (
    <div className="grid gap-4">
      {requests.map((req) => (
        <Card key={req.id}>
          <div className="grid gap-4 sm:grid-cols-3 sm:items-center">
            <div>
              <p className="text-xs text-muted">Utente</p>
              <p className="mt-1 text-sm font-semibold">{req.username}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Totale</p>
              <p className="mt-1 text-sm font-semibold">{formatEuro(req.totalPrice)}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button size="sm" onClick={() => handleAction(req.id, "accept")} className="w-full sm:w-auto">
                Accetta
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction(req.id, "reject")} className="w-full sm:w-auto">
                Rifiuta
              </Button>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted break-words">
            <RequestMessage request={req} decryptIfPossible={decryptIfPossible} />
          </p>
          {req.products?.length ? (
            <div className="mt-4 grid gap-2">
              {req.products.map((product) => (
                <div
                  key={`${product.productId}-${product.optionId ?? "base"}`}
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="break-words">
                    {product.optionName || "Prodotto"}
                    {product.optionQuantity ? ` - ${product.optionQuantity}` : ""} x{" "}
                    {product.quantity}
                  </span>
                  <span className="font-semibold">{formatEuro(product.unitPrice)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function RequestMessage({
  request,
  decryptIfPossible
}: {
  request: PendingRequest;
  decryptIfPossible: (req: PendingRequest) => Promise<string>;
}) {
  const [text, setText] = useState("Caricamento...");

  useEffect(() => {
    let active = true;
    decryptIfPossible(request).then((value) => {
      if (active) setText(value);
    });
    return () => {
      active = false;
    };
  }, [request, decryptIfPossible]);

  return <span>{text}</span>;
}
