/**
 * Gmail returns raw RFC 2822 header values, which are not fit to show a human:
 * `"Sarah Chen" <sarah@venue.com>` and `Wed, 23 Jul 2026 14:32:11 +0800`.
 * Non-ASCII names arrive MIME encoded (`=?UTF-8?B?5byg5LiJ?=`), which matters
 * here because plenty of vendors write in Chinese.
 */

/** Decode MIME "encoded-word" runs, e.g. `=?UTF-8?B?5byg5LiJ?=` -> `张三`. */
function decodeEncodedWords(value: string): string {
  return value.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (whole, charset: string, encoding: string, text: string) => {
      try {
        let bytes: Uint8Array;

        if (encoding.toUpperCase() === "B") {
          const binary = atob(text);
          bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        } else {
          // Q encoding: `_` is a space, `=XX` is a hex byte.
          const decoded = text
            .replace(/_/g, " ")
            .replace(/=([0-9A-Fa-f]{2})/g, (_m, hex: string) =>
              String.fromCharCode(parseInt(hex, 16))
            );
          bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
        }

        return new TextDecoder(charset).decode(bytes);
      } catch {
        // Unknown charset or malformed payload — better to show the raw run
        // than to blow up the whole inbox.
        return whole;
      }
    }
  );
}

/** `"Sarah Chen" <s@venue.com>` -> `Sarah Chen`; falls back to the address. */
export function senderName(raw: string): string {
  if (!raw) return "";

  const decoded = decodeEncodedWords(raw).trim();
  const withAngleBrackets = decoded.match(/^"?(.*?)"?\s*<([^>]+)>$/);

  if (withAngleBrackets) {
    const name = withAngleBrackets[1].trim();
    return name || withAngleBrackets[2].trim();
  }

  return decoded.replace(/^<|>$/g, "");
}

/** Header date -> `2h ago` / `yesterday` / `Jul 23`. Empty if unparseable. */
export function relativeTime(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Full timestamp for the `title` tooltip, so the exact time is still reachable. */
export function exactTime(raw: string): string {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
}
