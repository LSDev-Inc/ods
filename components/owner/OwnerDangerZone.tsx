"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export default function OwnerDangerZone() {
  const router = useRouter();
  const [pinOrPassphrase, setPinOrPassphrase] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleDestroy = async () => {
    setStatus(null);
    if (!pinOrPassphrase.trim()) {
      setStatus("Inserisci la tua passphrase.");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmDestroy = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    const res = await fetch("/api/owner/destroy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinOrPassphrase })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data?.error ?? "Operazione fallita.");
      setLoading(false);
      return;
    }

    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/");
  };

  return (
    <Card className="space-y-6 border border-ember/40 bg-ember/5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-ember">Zona Rischio</p>
        <h2 className="mt-3 text-2xl font-semibold">Distruzione completa del database</h2>
        <p className="mt-2 text-sm text-muted">
          Questa azione elimina utenti, richieste, chat, messaggi e impostazioni in modo permanente.
        </p>
      </div>
      <div className="grid gap-4">
        <Input
          label="Passphrase account owner"
          type="password"
          value={pinOrPassphrase}
          onChange={(event) => setPinOrPassphrase(event.target.value)}
          placeholder="Inserisci passphrase"
        />
        {status ? <p className="text-sm text-ember">{status}</p> : null}
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="border-ember/60 text-ember hover:border-ember"
            onClick={handleDestroy}
            disabled={loading}
          >
            {loading ? "Eliminazione..." : "Distruggi database"}
          </Button>
        </div>
      </div>
      {showConfirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-2xl bg-[#050816] p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Confermi la distruzione del database?</h3>
            <p className="mt-2 text-sm text-muted">
              Questa azione elimina definitivamente tutti i dati. Non potra essere annullata.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                className="border-white/20 text-fog hover:border-white/40"
                onClick={() => setShowConfirmModal(false)}
              >
                Annulla
              </Button>
              <Button
                variant="outline"
                className="border-ember/60 text-ember hover:border-ember"
                onClick={confirmDestroy}
              >
                Continua
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
