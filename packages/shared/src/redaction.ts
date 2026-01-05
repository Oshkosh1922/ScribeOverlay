import crypto from "crypto";
import { RedactionResult } from "./types";

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /\+?\d?[\s.-]?(?:\(\d{2,3}\)|\d{2,3})[\s.-]?\d{3,4}[\s.-]?\d{4}/g;
const WALLET_REGEX = /(0x[a-fA-F0-9]{32,}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})/g;
const LONG_ID_REGEX = /\b\d{12,}\b/g;

export function redact(text: string): RedactionResult {
  const replacements: Array<{ match: string; replacement: string }> = [];
  const applyMask = (pattern: RegExp, label: string, input: string) => {
    return input.replace(pattern, (match) => {
      const hash = crypto.createHash("sha256").update(match).digest("hex").slice(0, 8);
      const replacement = `[${label}:${hash}]`;
      replacements.push({ match, replacement });
      return replacement;
    });
  };

  let redacted = text;
  redacted = applyMask(EMAIL_REGEX, "email", redacted);
  redacted = applyMask(PHONE_REGEX, "phone", redacted);
  redacted = applyMask(WALLET_REGEX, "wallet", redacted);
  redacted = applyMask(LONG_ID_REGEX, "id", redacted);

  return { redacted, original: text, replaced: replacements };
}

export function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
