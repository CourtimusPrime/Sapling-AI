const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  const hashBytes = new Uint8Array(hashBuffer);
  const combined = new Uint8Array(SALT_LENGTH + KEY_LENGTH);
  combined.set(salt);
  combined.set(hashBytes, SALT_LENGTH);
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));
  const salt = combined.slice(0, SALT_LENGTH);
  const expectedHash = combined.slice(SALT_LENGTH);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  const hashBytes = new Uint8Array(hashBuffer);
  if (hashBytes.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hashBytes.length; i++) {
    diff |= hashBytes[i] ^ expectedHash[i];
  }
  return diff === 0;
}
