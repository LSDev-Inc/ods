"use client";

import { useState } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export default function UserSecurityForm() {
  const [password, setPassword] = useState("");
  const [pinOrPassphrase, setPinOrPassphrase] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setStatus(null);
    if (!password && !pinOrPassphrase) {
      setStatus("Compila almeno uno dei campi.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/user/security", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: password || undefined,
        pinOrPassphrase: pinOrPassphrase || undefined
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data?.error ?? "Salvataggio non riuscito.");
      setLoading(false);
      return;
    }
    setStatus("Dati aggiornati correttamente.");
    setPassword("");
    setPinOrPassphrase("");
    setLoading(false);
  };

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Sicurezza account</h2>
      <p className="text-sm text-muted">
        Puoi aggiornare la password e la PIN/passphrase. I cambiamenti richiederanno di rifare il
        login con le nuove credenziali.
      </p>
      <Input
        label="Nuova password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Lascia vuoto per non modificare"
      />
      <Input
        label="Nuova PIN/passphrase"
        type="password"
        value={pinOrPassphrase}
        onChange={(e) => setPinOrPassphrase(e.target.value)}
        placeholder="Lascia vuoto per non modificare"
      />
      {status ? <p className="text-sm text-ember">{status}</p> : null}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          Salva
        </Button>
      </div>
    </Card>
  );
}

