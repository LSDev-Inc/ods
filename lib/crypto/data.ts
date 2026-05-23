import { createHash, createHmac, webcrypto } from "crypto";
import { env } from "../env";

const subtle = webcrypto.subtle;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const PREFIX = "enc:v1:";

function bufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  const raw = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Buffer.from(raw).toString("base64");
}

function base64ToBuffer(base64: string) {
  return Buffer.from(base64, "base64");
}

let cachedKeyPromise: Promise<CryptoKey> | null = null;

async function getDataKey() {
  if (!cachedKeyPromise) {
    cachedKeyPromise = (async () => {
      const secret = process.env.DATA_ENCRYPTION_KEY || env.authSecret();
      const keyMaterial = createHash("sha256").update(secret).digest();
      return subtle.importKey("raw", keyMaterial, "AES-GCM", false, ["encrypt", "decrypt"]);
    })();
  }
  return cachedKeyPromise;
}

export function isEncrypted(value?: string | null) {
  return Boolean(value && value.startsWith(PREFIX));
}

export function normalizeUsername(value: string) {
  return value.trim();
}

export function hashLookup(value: string, namespace: string) {
  const secret = process.env.DATA_ENCRYPTION_KEY || env.authSecret();
  return createHmac("sha256", secret).update(`${namespace}:${value}`).digest("hex");
}

export async function encryptString(value?: string | null) {
  if (!value) return "";
  if (isEncrypted(value)) return value;
  const key = await getDataKey();
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    TEXT_ENCODER.encode(value)
  );
  return `${PREFIX}${bufferToBase64(iv)}:${bufferToBase64(ciphertext)}`;
}

export async function decryptString(value?: string | null) {
  if (!value) return "";
  if (!isEncrypted(value)) return value;
  try {
    const payload = value.slice(PREFIX.length);
    const [ivBase64, cipherBase64] = payload.split(":");
    if (!ivBase64 || !cipherBase64) {
      console.warn("Formato cifrato non valido, ritornando stringa vuota.");
      return "";
    }
    const key = await getDataKey();
    const plaintext = await subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(ivBase64)) },
      key,
      base64ToBuffer(cipherBase64)
    );
    return TEXT_DECODER.decode(plaintext);
  } catch (error) {
    console.warn("Errore durante la decrittazione:", error instanceof Error ? error.message : String(error));
    return "";
  }
}

export async function encryptNumber(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return encryptString(String(value));
}

export async function decryptNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value !== "string") return fallback;
  const decrypted = await decryptString(value);
  const parsed = Number(decrypted);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function encryptDate(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return encryptString(date.toISOString());
}

export async function decryptDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value !== "string") return null;
  try {
    const decrypted = await decryptString(value);
    const date = new Date(decrypted);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    console.warn("Errore durante la decrittazione della data:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function decryptDateToISOString(value: unknown) {
  const date = await decryptDate(value);
  return date ? date.toISOString() : "";
}
