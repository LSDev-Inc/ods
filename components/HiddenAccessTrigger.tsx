"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function HiddenAccessTrigger() {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "l") {
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = async () => {
    setError(null);
    const normalizedPin = pin.trim();
    if (normalizedPin.length < 4) {
      setError("Inserisci il PIN completo.");
      return;
    }

    const res = await fetch("/api/auth/access-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: normalizedPin })
    });

    if (res.ok) {
      router.push("/access");
      setOpen(false);
      setPin("");
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(data?.error ?? "PIN non valido");
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="group flex items-center gap-2 text-xs text-muted"
          aria-label="Accesso riservato"
        >
          <span className="h-3 w-3 rounded-full border border-white/30 bg-white/5 group-hover:border-ember/60" />
          Accesso riservato
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-slate p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold">Inserisci PIN</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted">
            Questo accesso e visibile solo a chi conosce il codice.
          </Dialog.Description>
          <div className="mt-6 space-y-4">
            <Input
              label="PIN"
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="••••"
            />
            {error ? <p className="text-sm text-ember">{error}</p> : null}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleSubmit}>Continua</Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
