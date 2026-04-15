export function bufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function base64ToBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function utf8ToBase64(text: string) {
  return bufferToBase64(new TextEncoder().encode(text));
}

export function base64ToUtf8(base64: string) {
  const buffer = base64ToBuffer(base64);
  return new TextDecoder().decode(buffer);
}
