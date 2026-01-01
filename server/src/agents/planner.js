import { nanoid } from "nanoid";

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toLocalDateTimeParts(date) {
  const pad = n => String(n).padStart(2, "0");
  return {
    y: date.getFullYear(),
    m: pad(date.getMonth() + 1),
    d: pad(date.getDate()),
    hh: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds())
  };
}

// Simple, deterministic “agent planner” (no LLM) so it always works
export function buildWeeklyPlan({
  goals,
  startDateISO,
  timezone,
  sessionMinutes,
  sessionsPerWeek
}) {
  const start = new Date(startDateISO);
  start.setHours(19, 0, 0, 0); // default 7:00 PM local

  const safeGoals = goals.trim().slice(0, 240);

  const sessions = [];
  const spacing = Math.floor(7 / Math.max(1, sessionsPerWeek)); // distribute
  for (let i = 0; i < sessionsPerWeek; i++) {
    const dtStart = addDays(start, i * spacing);
    const dtEnd = new Date(dtStart.getTime() + sessionMinutes * 60 * 1000);

    const p = toLocalDateTimeParts(dtStart);
    sessions.push({
      id: nanoid(10),
      title: `Study: ${safeGoals}`,
      description:
        `Focus goal: ${safeGoals}\nPlan: 10m review → 35m deep work → 10m recap → 5m next steps.\nTimezone label: ${timezone}`,
      startLocal: `${p.y}${p.m}${p.d}T${p.hh}${p.mm}${p.ss}`,
      endLocal: (() => {
        const e = toLocalDateTimeParts(dtEnd);
        return `${e.y}${e.m}${e.d}T${e.hh}${e.mm}${e.ss}`;
      })()
    });
  }

  return {
    timezone,
    events: sessions
  };
}
