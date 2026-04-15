"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type KeyringIdentity = {
  userId: string;
  role: "owner" | "admin" | "user";
  publicKey: string;
};

type KeyringContextValue = {
  privateKey: CryptoKey | null;
  identity: KeyringIdentity | null;
  setPrivateKey: (key: CryptoKey | null) => void;
  setIdentity: (identity: KeyringIdentity | null) => void;
  clear: () => void;
};

const KeyringContext = createContext<KeyringContextValue | undefined>(undefined);

export default function KeyringProvider({ children }: { children: React.ReactNode }) {
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [identity, setIdentity] = useState<KeyringIdentity | null>(null);

  const value = useMemo<KeyringContextValue>(() => {
    return {
      privateKey,
      identity,
      setPrivateKey,
      setIdentity,
      clear: () => {
        setPrivateKey(null);
        setIdentity(null);
      }
    };
  }, [privateKey, identity]);

  return <KeyringContext.Provider value={value}>{children}</KeyringContext.Provider>;
}

export function useKeyring() {
  const ctx = useContext(KeyringContext);
  if (!ctx) {
    throw new Error("useKeyring must be used within KeyringProvider");
  }
  return ctx;
}
