import { z } from "zod";

// Strict output schema + validation is recommended for safety (OWASP output monitoring/validation) [web:51]
export const AnswerSchema = z.object({
  answer: z.string().min(10).max(2000),
  citations: z
    .array(
      z.object({
        docTitle: z.string().min(1).max(80),
        chunkId: z.string().min(3).max(60),
        score: z.number().min(0),
        excerpt: z.string().min(1).max(400)
      })
    )
    .max(10)
});

export const PlanRequestSchema = z.object({
  goals: z.string().min(3).max(240),
  startDateISO: z.string().datetime(),
  timezone: z.string().min(3).max(80).default("Asia/Kathmandu"),
  sessionMinutes: z.number().int().min(15).max(180).default(60),
  sessionsPerWeek: z.number().int().min(1).max(7).default(5)
});
