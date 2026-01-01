import { nanoid } from "nanoid";

class InMemoryStore {
  constructor() {
    this.docs = [];
  }

  addDocument({ title, rawTextLength, injectionRisk, chunks }) {
    const docId = nanoid(10);
    this.docs.push({
      docId,
      title,
      rawTextLength,
      injectionRisk,
      chunks: chunks.map(c => ({ chunkId: `${docId}:${c.id}`, text: c.text }))
    });
    return docId;
  }

  allChunks() {
    const out = [];
    for (const doc of this.docs) {
      for (const c of doc.chunks) {
        out.push({
          docId: doc.docId,
          docTitle: doc.title,
          chunkId: c.chunkId,
          chunkText: c.text
        });
      }
    }
    return out;
  }
}

export const store = new InMemoryStore();
