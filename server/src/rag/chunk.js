export function chunkText(text, { maxChars = 950, overlapChars = 120 } = {}) {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  let id = 0;

  for (const p of paragraphs) {
    if (p.length <= maxChars) {
      chunks.push({ id: String(id++), text: p });
      continue;
    }

    // Sliding window chunking
    let i = 0;
    while (i < p.length) {
      const slice = p.slice(i, i + maxChars);
      chunks.push({ id: String(id++), text: slice.trim() });
      i += Math.max(1, maxChars - overlapChars);
    }
  }
  return chunks;
}
