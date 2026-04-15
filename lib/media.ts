const BLOB_REF_PREFIX = "blob:";
const BLOB_PROXY_PREFIX = "/api/blob/serve/";
const ALLOWED_BLOB_PREFIXES = ["products/images/", "products/videos/"];

export function toBlobRef(pathname: string) {
  return `${BLOB_REF_PREFIX}${pathname}`;
}

export function isBlobRef(value: string) {
  return value.startsWith(BLOB_REF_PREFIX);
}

export function getBlobPath(ref: string) {
  return ref.slice(BLOB_REF_PREFIX.length);
}

export function toBlobProxyUrl(pathname: string) {
  const safePath = pathname
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/api/blob/serve/${safePath}`;
}

function decodeProxyPath(pathname: string) {
  return pathname
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

function stripLeadingSlash(pathname: string) {
  return pathname.startsWith("/") ? pathname.slice(1) : pathname;
}

function isAllowedBlobPath(path: string) {
  return ALLOWED_BLOB_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function normalizeMediaRef(ref: string) {
  if (!ref) return "";
  if (isBlobRef(ref)) return ref;

  if (ref.startsWith(BLOB_PROXY_PREFIX)) {
    const encodedPath = ref.slice(BLOB_PROXY_PREFIX.length);
    const decodedPath = decodeProxyPath(encodedPath);
    if (isAllowedBlobPath(decodedPath)) return toBlobRef(decodedPath);
  }

  try {
    const url = new URL(ref);
    const pathname = url.pathname || "";
    if (pathname.startsWith(BLOB_PROXY_PREFIX)) {
      const encodedPath = pathname.slice(BLOB_PROXY_PREFIX.length);
      const decodedPath = decodeProxyPath(encodedPath);
      if (isAllowedBlobPath(decodedPath)) return toBlobRef(decodedPath);
    }
    const rawPath = stripLeadingSlash(pathname);
    if (isAllowedBlobPath(rawPath)) return toBlobRef(rawPath);
  } catch {
    // Not a valid URL; leave as-is.
  }

  return ref;
}

export function isAllowedMediaRef(ref: string) {
  if (!ref) return true;
  const normalized = normalizeMediaRef(ref);
  return isBlobRef(normalized);
}

export function resolveMediaRef(ref: string) {
  if (isBlobRef(ref)) {
    const path = getBlobPath(ref);
    return {
      url: toBlobProxyUrl(path),
      ref,
      path
    };
  }
  return {
    url: ref,
    ref,
    path: null
  };
}
