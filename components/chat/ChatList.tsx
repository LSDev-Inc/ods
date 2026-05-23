"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "../ui/card";

export type ChatListItem = {
  id: string;
  requestId: string;
  userId: string;
  adminId: string | null;
  lockedToAdminId: string | null;
  requestStatus: "pending" | "accepted" | "rejected";
  chatStatus: "in_progress" | "completed";
  products: {
    id: string;
    name: string;
    imageUrl: string;
    price: number;
    quantity: number;
  }[];
  createdAt: string;
};

export default function ChatList({ basePath }: { basePath: "user" | "admin" | "owner" }) {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const res = await fetch("/api/chats");
      if (!res.ok) return;
      const data = await res.json();
      if (active) {
        setChats(data);
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted">Caricamento chat...</p>;
  }

  if (!chats.length) {
    return <p className="text-sm text-muted">Nessuna chat disponibile.</p>;
  }

  const completedChats = chats.filter((chat) => chat.chatStatus === "completed");
  const activeChats = chats.filter((chat) => chat.chatStatus === "in_progress");

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        {activeChats.map((chat) => (
          <Card key={chat.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Chat {chat.id.slice(-6)}</p>
              <p className="text-xs text-muted break-words">
                Stato richiesta: {chat.requestStatus} - Stato chat:{" "}
                {chat.chatStatus === "in_progress" ? "In corso" : "Conclusa"}
              </p>
            </div>
            {chat.requestStatus === "accepted" ? (
              <Link className="w-full text-center text-sm text-ember hover:text-ember/80 sm:w-auto" href={`/${basePath}/chat/${chat.id}`}>
                Apri
              </Link>
            ) : (
              <span className="text-xs text-muted">Non attiva</span>
            )}
          </Card>
        ))}
      </div>

      {completedChats.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-emerald-400">Chat concluse</p>
          <p className="text-xs text-muted">
            Le chat concluse vengono eliminate automaticamente dopo 10 minuti.
          </p>
        </div>
      )}
    </div>
  );
}
