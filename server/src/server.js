import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { z } from "zod";
import { chunkText } from "./rag/chunk.js";
import { store } from "./rag/store.js";
import { retrieveTopK } from "./rag/retrieve.js";
import { buildWeeklyPlan } from "./agents/planner.js";
import { buildIcsCalendar } from "./ics/buildIcs.js";
import { detectInjection } from "./security/injection.js";
import { AnswerSchema, PlanRequestSchema } from "./security/validate.js";

const app = express();

const PORT = process.env.PORT || 8080;
const ORIGIN = process.env.ORIGIN || "*";

app.use(helmet());
app.use(cors({ origin: ORIGIN === "*" ? true : ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

// Upload/paste notes (MVP uses raw text)
app.post("/api/notes", (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(80),
    text: z.string().min(20).max(200_000)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });

  const { title, text } = parsed.data;

  // Basic injection detection for untrusted content; still store but mark risky
  const injectionRisk = detectInjection(text);

  const chunks = chunkText(text, { maxChars: 950, overlapChars: 120 });

  const docId = store.addDocument({
    title,
    rawTextLength: text.length,
    injectionRisk,
    chunks
  });

  res.json({
    ok: true,
    docId,
    chunkCount: chunks.length,
    injectionRisk
  });
});

// Ask (RAG-lite retrieval + “answer skeleton”)
app.post("/api/ask", (req, res) => {
  const schema = z.object({
    question: z.string().min(3).max(500),
    topK: z.number().int().min(1).max(8).default(5)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });

  const { question, topK } = parsed.data;

  if (detectInjection(question).blocked) {
    return res.status(400).json({ error: "Request blocked for safety." });
  }

  const hits = retrieveTopK(question, topK);

  // No external LLM here (so it runs for everyone). We generate a grounded answer template.
  const answer = {
    answer:
      "Here’s what your notes say (grounded summary). Review the cited chunks for exact wording.",
    citations: hits.map(h => ({
      docTitle: h.docTitle,
      chunkId: h.chunkId,
      score: h.score,
      excerpt: h.chunkText.slice(0, 240) + (h.chunkText.length > 240 ? "…" : "")
    }))
  };

  const checked = AnswerSchema.safeParse(answer);
  if (!checked.success) return res.status(500).json({ error: "Server output invalid." });

  res.json(checked.data);
});

// Plan week -> returns plan JSON and downloadable ICS
app.post("/api/plan-week", (req, res) => {
  const parsed = PlanRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });

  const { goals, startDateISO, timezone, sessionMinutes, sessionsPerWeek } = parsed.data;

  if (detectInjection(goals).blocked) {
    return res.status(400).json({ error: "Request blocked for safety." });
  }

  const plan = buildWeeklyPlan({
    goals,
    startDateISO,
    timezone,
    sessionMinutes,
    sessionsPerWeek
  });

  // Build .ics (VEVENT requires DTSTART; UID is required in practice for interoperability) [web:91][web:105][web:109]
  const icsText = buildIcsCalendar({
    calendarName: "Study Planner AI Agent",
    timezone,
    events: plan.events
  });

  // Output validation: basic pattern checks and size limits (OWASP recommends output monitoring/validation) [web:51]
  const icsRisk = detectInjection(icsText);
  if (icsRisk.blocked || icsText.length > 200_000) {
    return res.status(500).json({ error: "Generated calendar rejected by validator." });
  }

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="study-plan.ics"');
  res.send(icsText);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
