"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { encryptPrivateKey, exportPublicKey, generateKeyPair } from "../../lib/crypto/client";

export type AdminUser = {
  id: string;
  username: string;
  disabled: boolean;
  createdAt: string;
};

export default function AdminList() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<Record<string, string>>({});
  const [resetPin, setResetPin] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admins");
    if (!res.ok) {
      setError("Impossibile caricare gli admin.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setAdmins(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateAdmin = async (id: string, payload: Record<string, unknown>) => {
    setActionError(null);
    const res = await fetch(`/api/admins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      await load();
      return true;
    }
    const data = await res.json().catch(() => ({}));
    setActionError(data?.error ?? "Aggiornamento fallito.");
    return false;
  };

  const deleteAdmin = async (id: string) => {
    setActionError(null);
    const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
    }
  };

  const rotateCredentials = async (id: string) => {
    const password = resetPassword[id];
    const pinOrPassphrase = resetPin[id];
    if (!password || !pinOrPassphrase) {
      setActionError("Inserisci password e PIN/passphrase prima di ruotare le chiavi.");
      return;
    }

    const keyPair = await generateKeyPair();
    const publicKey = await exportPublicKey(keyPair.publicKey);
    const { privateKeyEncrypted, privateKeyIv, kdfSalt } = await encryptPrivateKey(
      keyPair.privateKey,
      password,
      pinOrPassphrase
    );

    await updateAdmin(id, {
      password,
      pinOrPassphrase,
      publicKey,
      privateKeyEncrypted,
      privateKeyIv,
      kdfSalt
    });
  };

  if (loading) return <p className="text-sm text-muted">Caricamento admin...</p>;
  if (error) return <p className="text-sm text-ember">{error}</p>;

  return (
    <div className="grid gap-4">
      {actionError ? <p className="text-sm text-ember">{actionError}</p> : null}
      {admins.map((admin) => (
        <Card key={admin.id}>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
            <div>
              <p className="text-xs text-muted">Admin</p>
              <p className="mt-1 text-sm font-semibold">{admin.username}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                size="sm"
                variant={admin.disabled ? "outline" : "ghost"}
                onClick={() => updateAdmin(admin.id, { disabled: !admin.disabled })}
                className="w-full sm:w-auto"
              >
                {admin.disabled ? "Riattiva" : "Disattiva"}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => deleteAdmin(admin.id)}
                className="w-full sm:w-auto"
              >
                Elimina
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              label="Reset password"
              type="password"
              value={resetPassword[admin.id] || ""}
              onChange={(e) =>
                setResetPassword((prev) => ({ ...prev, [admin.id]: e.target.value }))
              }
            />
            <Input
              label="Reset PIN/passphrase"
              type="password"
              value={resetPin[admin.id] || ""}
              onChange={(e) => setResetPin((prev) => ({ ...prev, [admin.id]: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              onClick={() => rotateCredentials(admin.id)}
              className="w-full sm:w-auto"
            >
              Ruota credenziali + chiavi
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
