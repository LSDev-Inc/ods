"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKeyring } from "./KeyringProvider";

export default function SessionGuard({
  redirectTo = "/access",
  intervalMs = 10000
}: {
  redirectTo?: string;
  intervalMs?: number;
}) {
  const router = useRouter();
  const { clear } = useKeyring();

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!active) return;
        if (!res.ok) {
          clear();
          router.replace(redirectTo);
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          clear();
          router.replace(redirectTo);
        }
      } catch {
        if (!active) return;
        clear();
        router.replace(redirectTo);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, intervalMs);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [clear, intervalMs, redirectTo, router]);

  return null;
}
