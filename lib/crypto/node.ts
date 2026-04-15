import { webcrypto } from "crypto";

const subtle = webcrypto.subtle;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

function bufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  const raw = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Buffer.from(raw).toString("base64");
}

function base64ToBuffer(base64: string) {
  return Buffer.from(base64, "base64");
}

export async function generateKeyPair() {
  return subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportPublicKey(publicKey: CryptoKey) {
  const spki = await subtle.exportKey("spki", publicKey);
  return bufferToBase64(spki);
}

export async function exportPrivateKey(privateKey: CryptoKey) {
  const pkcs8 = await subtle.exportKey("pkcs8", privateKey);
  return bufferToBase64(pkcs8);
}

export async function deriveKeyFromCredentials(
  password: string,
  pinOrPassphrase: string,
  saltBase64?: string
) {
  const salt = saltBase64
    ? new Uint8Array(base64ToBuffer(saltBase64))
    : webcrypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(`${password}:${pinOrPassphrase}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const derivedKey = await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return { key: derivedKey, salt: bufferToBase64(salt) };
}

export async function encryptPrivateKey(
  privateKey: CryptoKey,
  password: string,
  pinOrPassphrase: string
) {
  const pkcs8Base64 = await exportPrivateKey(privateKey);
  const { key, salt } = await deriveKeyFromCredentials(password, pinOrPassphrase);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    TEXT_ENCODER.encode(pkcs8Base64)
  );

  return {
    privateKeyEncrypted: bufferToBase64(ciphertext),
    privateKeyIv: bufferToBase64(iv),
    kdfSalt: salt
  };
}

export async function decryptPrivateKey(
  privateKeyEncrypted: string,
  privateKeyIv: string,
  password: string,
  pinOrPassphrase: string,
  kdfSalt: string
) {
  const { key } = await deriveKeyFromCredentials(password, pinOrPassphrase, kdfSalt);
  const decrypted = await subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(privateKeyIv)) },
    key,
    base64ToBuffer(privateKeyEncrypted)
  );

  const pkcs8Base64 = TEXT_DECODER.decode(decrypted);
  return pkcs8Base64;
}
