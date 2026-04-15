"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { decryptPrivateKey } from "../../lib/crypto/client";
import { useKeyring } from "../KeyringProvider";

export default function LoginForm({ role }: { role: "user" | "admin" }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pinOrPassphrase, setPinOrPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setPrivateKey, setIdentity } = useKeyring();

  const handleStep1 = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login/step1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Credenziali non valide");
      setLoading(false);
      return;
    }

    setStep(2);
    setLoading(false);
  };

  const handleStep2 = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login/step2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinOrPassphrase })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "PIN o passphrase non valida");
      setLoading(false);
      return;
    }

    const data = await res.json();
    try {
      const privateKey = await decryptPrivateKey(
        data.privateKeyEncrypted,
        data.privateKeyIv,
        password,
        pinOrPassphrase,
        data.kdfSalt
      );
      setPrivateKey(privateKey);
      setIdentity({ userId: data.userId, role: data.role, publicKey: data.publicKey });
      if (data.role === "owner") {
        router.replace("/owner");
      } else if (data.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/user");
      }
    } catch {
      setError("Impossibile decifrare la chiave privata. Controlla PIN e password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {step === 1 ? (
        <>
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-ember">{error}</p> : null}
          <Button onClick={handleStep1} disabled={loading}>
            Continua
          </Button>
        </>
      ) : (
        <>
          <Input
            label="PIN o passphrase"
            type="password"
            value={pinOrPassphrase}
            onChange={(e) => setPinOrPassphrase(e.target.value)}
          />
          {error ? <p className="text-sm text-ember">{error}</p> : null}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={loading}>
              Indietro
            </Button>
            <Button onClick={handleStep2} disabled={loading}>
              Entra
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
