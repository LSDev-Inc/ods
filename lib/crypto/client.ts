"use client";

import { base64ToBuffer, base64ToUtf8, bufferToBase64, utf8ToBase64 } from "./base64";

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  encryptedSymKey: string;
};

export async function generateKeyPair() {
  return crypto.subtle.generateKey(
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
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  return bufferToBase64(spki);
}

export async function exportPrivateKey(privateKey: CryptoKey) {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  return bufferToBase64(pkcs8);
}

export async function importPublicKey(spkiBase64: string) {
  return crypto.subtle.importKey(
    "spki",
    base64ToBuffer(spkiBase64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

export async function importPrivateKey(pkcs8Base64: string) {
  return crypto.subtle.importKey(
    "pkcs8",
    base64ToBuffer(pkcs8Base64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

export async function deriveKeyFromCredentials(
  password: string,
  pinOrPassphrase: string,
  saltBase64?: string
) {
  const salt = saltBase64
    ? new Uint8Array(base64ToBuffer(saltBase64))
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(`${password}:${pinOrPassphrase}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
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
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
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
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(privateKeyIv)) },
    key,
    base64ToBuffer(privateKeyEncrypted)
  );

  const pkcs8Base64 = TEXT_DECODER.decode(decrypted);
  return importPrivateKey(pkcs8Base64);
}

export async function encryptMessage(plaintext: string, recipientPublicKeyBase64: string): Promise<EncryptedPayload> {
  const recipientKey = await importPublicKey(recipientPublicKeyBase64);
  const symKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt"
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    symKey,
    TEXT_ENCODER.encode(plaintext)
  );
  const rawSymKey = await crypto.subtle.exportKey("raw", symKey);
  const encryptedSymKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientKey, rawSymKey);

  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
    encryptedSymKey: bufferToBase64(encryptedSymKey)
  };
}

export async function decryptMessage(payload: EncryptedPayload, privateKey: CryptoKey) {
  const rawSymKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBuffer(payload.encryptedSymKey)
  );
  const symKey = await crypto.subtle.importKey(
    "raw",
    rawSymKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(payload.iv)) },
    symKey,
    base64ToBuffer(payload.ciphertext)
  );
  return TEXT_DECODER.decode(plaintextBuffer);
}

export function serializeKeyMaterial(key: CryptoKey) {
  return key;
}

export function decodeBase64Payload(base64: string) {
  return base64ToUtf8(base64);
}

export function encodeBase64Payload(plain: string) {
  return utf8ToBase64(plain);
}
