/** AES-GCM encryption/decryption using the Web Crypto API.
 *  The encryption key is derived from the ENCRYPTION_KEY env var (or a dev fallback).
 *  Encrypted values are stored as base64url(iv + ciphertext).
 */

function getKeyMaterial(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(
    Deno.env.get("ENCRYPTION_KEY") ?? "dev-encryption-key-32-bytes-pad!",
  );
  return crypto.subtle.importKey("raw", raw.slice(0, 32), "HKDF", false, ["deriveKey"]);
}

async function deriveKey(): Promise<CryptoKey> {
  const keyMaterial = await getKeyMaterial();
  return crypto.subtle.deriveKey(
    { hash: "SHA-256", info: new Uint8Array(), name: "HKDF", salt: new Uint8Array(16) },
    keyMaterial,
    { length: 256, name: "AES-GCM" },
    false,
    ["decrypt", "encrypt"],
  );
}

/** Encrypt a plaintext string; returns a base64url-encoded string (iv || ciphertext). */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ iv, name: "AES-GCM" }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Decrypt a base64url-encoded string produced by encrypt(). */
export async function decrypt(encoded: string): Promise<string> {
  const key = await deriveKey();
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const b64 = padded + "=".repeat(padLen);
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const plaintext = await crypto.subtle.decrypt({ iv, name: "AES-GCM" }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
