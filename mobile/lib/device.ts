// Device identity — random install-id persisted in MMKV (NOT a fingerprint).
// Used as deviceHash for votes/reports/submissions dedupe. Privacy-safe:
// uninstall resets it; no hardware identifiers ever read.
import { getKV, type KV } from './storage';

const storage: KV = getKV('bellsnotes-device');
const KEY = 'device.hash';

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(arr);
  } else {
    // Expo Go / older runtimes don't ship WebCrypto. This id is a vote-dedupe
    // key, not a secret — a seeded xorshift (time + Math.random) is fine.
    let seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 0x9e3779b9;
    for (let i = 0; i < arr.length; i++) {
      seed ^= seed << 13;
      seed >>>= 0;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      seed >>>= 0;
      arr[i] = seed & 0xff;
    }
  }
  let s = '';
  for (const b of arr) s += b.toString(16).padStart(2, '0');
  return s;
}

export function getDeviceHash(): string {
  let h = storage.getString(KEY);
  if (!h) {
    h = `dev_${randomHex(8)}`;
    try {
      storage.set(KEY, h);
    } catch {
      return `dev_${randomHex(8)}`;
    }
  }
  return h;
}
