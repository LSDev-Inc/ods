"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { encryptPrivateKey, exportPublicKey, generateKeyPair } from "../../lib/crypto/client";

export default function RegisterForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pinOrPassphrase, setPinOrPassphrase] = useState("");
  const [mode, setMode] = useState<"pin" | "passphrase">("pin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async () => {
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

      const res = await fetch("/api/auth/register", {
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
        setError(data?.error ?? "Registrazione fallita");
        setLoading(false);
        return;
      }

      router.replace("/auth/user/login");
    } catch (err) {
      setError("Errore crittografico: impossibile creare le chiavi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "pin" ? "primary" : "outline"}
          size="sm"
          onClick={() => setMode("pin")}
        >
          PIN
        </Button>
        <Button
          type="button"
          variant={mode === "passphrase" ? "primary" : "outline"}
          size="sm"
          onClick={() => setMode("passphrase")}
        >
          Passphrase
        </Button>
      </div>
      <Input
        label={mode === "pin" ? "PIN" : "Passphrase"}
        type="password"
        value={pinOrPassphrase}
        onChange={(e) => setPinOrPassphrase(e.target.value)}
      />
      {error ? <p className="text-sm text-ember">{error}</p> : null}
      <Button onClick={handleRegister} disabled={loading}>
        Crea account
      </Button>
    </div>
  );
}
