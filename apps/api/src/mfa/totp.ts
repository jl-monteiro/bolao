import { createHmac, randomBytes } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_DIGITS = 6;
const TOTP_STEP_SECONDS = 30;

export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

export function buildTotpUri(input: {
  email: string;
  issuer: string;
  secret: string;
}): string {
  const label = encodeURIComponent(`${input.issuer}:${input.email}`);
  const issuer = encodeURIComponent(input.issuer);

  return `otpauth://totp/${label}?secret=${input.secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

export function verifyTotpCode(input: {
  code: string;
  now: Date;
  secret: string;
  window?: number;
}): boolean {
  const code = input.code.trim();

  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const window = input.window ?? 1;
  const counter = Math.floor(
    input.now.getTime() / 1000 / TOTP_STEP_SECONDS,
  );

  for (let offset = -window; offset <= window; offset += 1) {
    if (generateHotp(input.secret, counter + offset) === code) {
      return true;
    }
  }

  return false;
}

export function generateTotpCode(input: {
  now: Date;
  secret: string;
}): string {
  const counter = Math.floor(
    input.now.getTime() / 1000 / TOTP_STEP_SECONDS,
  );
  return generateHotp(input.secret, counter);
}

function encodeBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(secret: string): Buffer {
  const normalized = secret
    .replace(/=+$/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);

    if (index === -1) {
      throw new Error("Invalid base32 secret");
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateHotp(secret: string, counter: number): string {
  const key = decodeBase32(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}
