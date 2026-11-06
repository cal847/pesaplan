// Splits pasted transaction messages. Uses transaction code + "CONFIRMED" as cues.
const MESSAGE_START = /(?=\b[A-Z0-9]{10}\s+[Cc]onfirmed)/;

export function splitMessages(pasted: string): string[] {
  return pasted
    .split(MESSAGE_START)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}