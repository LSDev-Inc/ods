"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { encryptPrivateKey, exportPublicKey, generateKeyPair } from "../../lib/crypto/client";

export default function AdminCreateForm({ onCreated }: { onCreated?: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pinOrPassphrase, setPinOrPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const keyPair = await generateKeyPair();
      const publicKey = await exportPublicKey(keyPair.publicKey);
      const { privateKeyEncrypted, privateKeyIv, kdfSalt } = await encryptPrivateKey(
        keyPair.privateKey,
        password,
        pinOrPassphrase
      );

      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          pinOrPassphrase,
          publicKey,
          privateKeyEncrypted,
          privateKeyIv,
          kdfSalt
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Creazione fallita");
        setLoading(false);
        return;
      }

      setUsername("");
      setPassword("");
      setPinOrPassphrase("");
      onCreated?.();
    } catch {
      setError("Errore crittografico: impossibile creare le chiavi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input label="Username admin" value={username} onChange={(e) => setUsername(e.target.value)} />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="PIN o passphrase"
        type="password"
        value={pinOrPassphrase}
        onChange={(e) => setPinOrPassphrase(e.target.value)}
      />
      {error ? <p className="text-sm text-ember">{error}</p> : null}
      <Button onClick={handleCreate} disabled={loading}>
        Crea admin
      </Button>
    </div>
  );
}
