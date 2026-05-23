"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { decryptMessage, encryptMessage } from "../../lib/crypto/client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { useKeyring } from "../KeyringProvider";
import type { ChatStatus } from "../../db/models/Chat";
import { formatEuro } from "../../lib/formatPrice";

export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  ciphertext: string;
  iv: string;
  encryptedSymKey: string;
  createdAt: string;
  plaintext?: string;
};

type RequestProductSummary = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
};

type RequestInfo = {
  products: RequestProductSummary[];
  customMessageCiphertext: string;
  customMessageIv: string;
  customMessageEncryptedSymKey: string;
};

export default function ChatRoom({
  chatId,
  counterpartId,
  counterpartPublicKey,
  canSend,
  returnHref,
  requestInfo
}: {
  chatId: string;
  counterpartId: string;
  counterpartPublicKey: string;
  canSend: boolean;
  returnHref?: string;
  requestInfo?: RequestInfo;
}) {
  const { privateKey, identity } = useKeyring();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
   const [chatStatus, setChatStatus] = useState<ChatStatus | null>(null);
  const [requestPlainMessage, setRequestPlainMessage] = useState<string | null>(null);

  const myId = identity?.userId;
  const canDelete = identity?.role === "admin" || identity?.role === "owner";

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [messagesRes, chatRes] = await Promise.all([
        fetch(`/api/chats/${chatId}/messages`),
        fetch(`/api/chats/${chatId}`)
      ]);

      if (!messagesRes.ok) {
        return;
      }
      const data: ChatMessage[] = await messagesRes.json();

      const withPlain = await Promise.all(
        data.map(async (message) => {
          if (!privateKey || message.receiverId !== myId) {
            return message;
          }
          try {
            const plaintext = await decryptMessage(
              {
                ciphertext: message.ciphertext,
                iv: message.iv,
                encryptedSymKey: message.encryptedSymKey
              },
              privateKey
            );
            return { ...message, plaintext };
          } catch {
            return message;
          }
        })
      );

      if (active) {
        const unique = new Map<string, ChatMessage>();
        withPlain.forEach((message) => {
          if (!unique.has(message.id)) unique.set(message.id, message);
        });
        setMessages(Array.from(unique.values()));
      }

      if (chatRes.ok) {
        const meta = await chatRes.json();
        if (active) setChatStatus(meta.status as ChatStatus);
      } else if (chatRes.status === 404 && active) {
        router.push(returnHref ?? "/");
      }
    };

    load();
    const interval = setInterval(load, 2500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [chatId, privateKey, myId, router, returnHref]);

  useEffect(() => {
    const decryptRequestMessage = async () => {
      if (!requestInfo) return;
      if (!privateKey || identity?.role !== "owner") {
        setRequestPlainMessage("Messaggio cifrato");
        return;
      }
      try {
        const plain = await decryptMessage(
          {
            ciphertext: requestInfo.customMessageCiphertext,
            iv: requestInfo.customMessageIv,
            encryptedSymKey: requestInfo.customMessageEncryptedSymKey
          },
          privateKey
        );
        setRequestPlainMessage(plain);
      } catch {
        setRequestPlainMessage("Messaggio cifrato");
      }
    };

    decryptRequestMessage();
  }, [requestInfo, privateKey, identity]);

  const sorted = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setStatus(null);

    if (chatStatus === "completed") {
      setStatus("La chat e conclusa. Non puoi inviare altri messaggi.");
      return;
    }

    try {
      if (!counterpartPublicKey) {
        setStatus("Chiave pubblica destinatario mancante.");
        return;
      }
      const encrypted = await encryptMessage(text.trim(), counterpartPublicKey);
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: counterpartId,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          encryptedSymKey: encrypted.encryptedSymKey
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data?.error ?? "Invio fallito");
        return;
      }

      const data = await res.json();
      setMessages((prev) => {
        if (prev.some((message) => message.id === data.id)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: data.id,
            senderId: myId || "",
            receiverId: counterpartId,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            encryptedSymKey: encrypted.encryptedSymKey,
            createdAt: new Date().toISOString(),
            plaintext: text.trim()
          }
        ];
      });
      setText("");
    } catch {
      setStatus("Errore crittografico: messaggio non inviato.");
    }
  };

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    setDeleteStatus(null);
    const confirmed = window.confirm(
      "Confermi l'eliminazione della chat e di tutti i messaggi? Questa azione e irreversibile."
    );
    if (!confirmed) return;

    setDeleting(true);
    const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteStatus(data?.error ?? "Eliminazione fallita.");
      setDeleting(false);
      return;
    }

    router.push(returnHref ?? "/");
  };

  const handleComplete = async () => {
    if (!identity || (identity.role !== "admin" && identity.role !== "owner")) return;
    if (chatStatus === "completed") return;

    const res = await fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data?.error ?? "Impossibile aggiornare lo stato della chat.");
      return;
    }

    const data = await res.json();
    setChatStatus(data.status as ChatStatus);
  };

  return (
    <div className="space-y-6">
      {canDelete ? (
        <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted">Azioni chat</p>
            <p className="text-xs text-muted">
              Stato chat:{" "}
              <span className="font-semibold">
                {chatStatus === "completed" ? "Conclusa" : "In corso"}
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {chatStatus !== "completed" ? (
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/60 text-emerald-400 hover:border-emerald-400 w-full sm:w-auto"
                onClick={handleComplete}
              >
                Imposta su concluso
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="border-ember/50 text-ember hover:border-ember w-full sm:w-auto"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminazione..." : "Elimina chat"}
            </Button>
          </div>
        </div>
      ) : null}
      {deleteStatus ? <p className="text-sm text-ember">{deleteStatus}</p> : null}
      {!privateKey ? (
        <p className="text-sm text-ember">
          Chiave privata non disponibile. Esegui nuovamente il login per decrittare i messaggi.
        </p>
      ) : null}
      {requestInfo ? (
        <Card className="space-y-3 border-emerald-500/40 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-black/20">
              {requestInfo.products[0]?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={requestInfo.products[0].imageUrl}
                  alt={requestInfo.products[0].name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                  Img
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {requestInfo.products.map((p) => p.name).join(", ")}
              </p>
              <p className="text-xs text-emerald-300">
                {requestInfo.products
                  .map((p) => `Q.tà ${p.quantity} · ${formatEuro(p.price)}`)
                  .join(" | ")}
              </p>
            </div>
          </div>
          {requestPlainMessage ? (
            <p className="text-sm text-muted">
              Messaggio utente: <span className="font-medium">{requestPlainMessage}</span>
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card className="max-h-[520px] overflow-y-auto">
        <div className="space-y-4">
          {sorted.map((message) => {
            const isMine = message.senderId === myId;
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                  isMine ? "bg-ember/20 text-fog" : "bg-white/10 text-fog"
                }`}>
                  {message.plaintext ?? (isMine ? "Messaggio inviato" : "Messaggio cifrato")}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {!canSend || chatStatus === "completed" ? (
        <p className="text-sm text-muted">
          {chatStatus === "completed"
            ? "La chat e stata conclusa. Non puoi piu inviare messaggi."
            : "La chat sara attiva dopo l&apos;accettazione."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <Input
            label="Scrivi un messaggio"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Messaggio cifrato..."
          />
          {status ? <p className="text-sm text-ember">{status}</p> : null}
          <Button onClick={handleSend}>Invia</Button>
        </div>
      )}
    </div>
  );
}
