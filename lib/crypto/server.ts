import { timingSafeEqual } from "crypto";

type Argon2Module = typeof import("argon2");

let argon2Promise: Promise<Argon2Module> | null = null;

async function loadArgon2() {
  if (!argon2Promise) {
    argon2Promise = import("argon2");
  }
  return argon2Promise;
}

async function getArgon2() {
  const mod: any = await loadArgon2();
  return mod?.default ?? mod;
}

export async function hashSecret(secret: string) {
  const argon2 = await getArgon2();
  return argon2.hash(secret, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
}

export async function verifySecret(hash: string, secret: string) {
  const argon2 = await getArgon2();
  return argon2.verify(hash, secret);
}

export function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}
