"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { decryptMessage } from "../../lib/crypto/client";
import { useKeyring } from "../KeyringProvider";

export type PendingRequest = {
  id: string;
  userId: string;
  username: string;
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted">User</p>
              <p className="text-base font-semibold">{req.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Totale</p>
              <p className="text-base font-semibold">EUR {req.totalPrice}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleAction(req.id, "accept")}>
                Accetta
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction(req.id, "reject")}>
                Rifiuta
              </Button>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">
            <RequestMessage request={req} decryptIfPossible={decryptIfPossible} />
          </p>
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
