// Lightweight detection based on common prompt-injection patterns (OWASP describes prompt injection risks) [web:87]
const patterns = [
  /ignore (all|previous) instructions/i,
  /reveal (the )?(system|developer) prompt/i,
  /developer mode/i,
  /jailbreak/i,
  /exfiltrate/i,
  /api[_\s-]?key/i
];

export function detectInjection(text) {
  const t = String(text || "");
  const matched = patterns.filter(r => r.test(t)).map(r => r.source);

  // blocked: clear malicious intent; risky: store but treat cautiously
  const blocked = matched.length >= 2;
  const risky = matched.length >= 1;

  return { blocked, risky, matched };
}
