/**
 * Compact previous_assistant_message for score_turn (DPM echo spec).
 * Agents should apply inline each turn; this script is the normative reference.
 */

export const CODING_ECHO_MAX = 7000;
export const CHAT_ECHO_MAX = 16000;
export const HEAD_CHARS = 3200;
export const TAIL_CHARS = 3200;
export const INGEST_ECHO_MAX = 16000;

/** @param {number} originalLen */
export function omissionMarker(originalLen) {
  return `\n\n[... middle omitted for DPM scoring; ${originalLen} chars total ...]\n\n`;
}

/**
 * @param {string} text
 * @param {number} bodyMax
 * @param {number} headChars
 * @param {number} tailChars
 */
export function compactHeadTail(text, bodyMax, headChars = HEAD_CHARS, tailChars = TAIL_CHARS) {
  if (text.length <= bodyMax) return text;

  let head = headChars;
  let tail = tailChars;

  const buildBody = (h, t) => {
    const marker = omissionMarker(text.length);
    return text.slice(0, h) + marker + text.slice(-t);
  };

  let body = buildBody(head, tail);
  while (body.length > bodyMax && (head > 80 || tail > 80)) {
    head = Math.max(80, Math.floor(head * 0.85));
    tail = Math.max(80, Math.floor(tail * 0.85));
    body = buildBody(head, tail);
  }

  if (body.length > bodyMax) {
    const marker = omissionMarker(text.length);
    const remaining = Math.max(0, bodyMax - marker.length);
    head = Math.floor(remaining / 2);
    tail = remaining - head;
    body = text.slice(0, head) + marker + text.slice(-tail);
  }

  return body.slice(0, bodyMax);
}

/**
 * @param {string | undefined | null} text
 * @param {{ profile?: 'coding' | 'chat', maxChars?: number, summary?: string }} [opts]
 */
export function prepareAssistantEcho(text, opts = {}) {
  const profile = opts.profile ?? "coding";
  const maxChars = opts.maxChars ?? (profile === "coding" ? CODING_ECHO_MAX : CHAT_ECHO_MAX);
  const summary = typeof opts.summary === "string" ? opts.summary.trim() : "";

  const raw = typeof text === "string" ? text : "";
  if (!raw) return raw;

  const summaryPrefix = summary ? `${summary}\n\n` : "";
  const summaryLen = summaryPrefix.length;
  const bodyMax = Math.max(0, maxChars - summaryLen);

  if (raw.length <= bodyMax) {
    return summaryPrefix ? `${summaryPrefix}${raw}` : raw;
  }

  const body = compactHeadTail(raw, bodyMax);
  return `${summaryPrefix}${body}`.slice(0, maxChars);
}

/** Deterministic mock summary for sim harness (first sentence / line). */
export function mockEchoSummary(text) {
  const t = (text ?? "").trim();
  if (!t) return "";
  const sentence = t.match(/^[^.!?\n]+[.!?]?/)?.[0]?.trim();
  const line = t.split("\n")[0]?.trim();
  const pick = sentence && sentence.length <= 240 ? sentence : line ?? t;
  return pick.length > 240 ? `${pick.slice(0, 237).trim()}…` : pick;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const args = process.argv.slice(2);
  const profile = args.includes("--chat") ? "chat" : "coding";
  let summary = "";
  const summaryIdx = args.indexOf("--summary");
  if (summaryIdx >= 0 && args[summaryIdx + 1]) summary = args[summaryIdx + 1];

  readStdin()
    .then((input) => {
      process.stdout.write(
        prepareAssistantEcho(input, {
          profile,
          ...(summary ? { summary } : {}),
        }),
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
