import { store } from "./store.js";

function tokenize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/g)
    .filter(Boolean);
}

function scoreChunk(queryTokens, chunkText) {
  const text = chunkText.toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (t.length < 3) continue;
    if (text.includes(t)) score += 1;
  }
  // Normalize a bit by chunk size
  return score / Math.max(50, chunkText.length / 10);
}

export function retrieveTopK(question, k = 5) {
  const chunks = store.allChunks();
  const q = tokenize(question);

  const scored = chunks
    .map(c => ({ ...c, score: scoreChunk(q, c.chunkText) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored;
}
