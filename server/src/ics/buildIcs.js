import { nanoid } from "nanoid";

// ICS basics per RFC 5545 (VCALENDAR/VEVENT; DTSTART defines start; UID helps uniqueness) [web:105][web:91]
function foldLine(line) {
  // RFC folding: lines > 75 octets should be folded; simplified here by chars
  if (line.length <= 75) return line;
  let out = "";
  let i = 0;
  while (i < line.length) {
    const part = line.slice(i, i + 75);
    out += (i === 0 ? part : `\r\n ${part}`);
    i += 75;
  }
  return out;
}

function escText(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcsCalendar({ calendarName, timezone, events }) {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//AI Study Agent//EN");
  lines.push(foldLine(`X-WR-CALNAME:${escText(calendarName)}`));
  lines.push(foldLine(`X-WR-TIMEZONE:${escText(timezone)}`));

  for (const ev of events) {
    const uid = `${ev.id || nanoid(10)}@ai-study-agent.local`;

    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${uid}`));
    lines.push(`DTSTAMP:${dtstamp}`);
    // Use floating local time for compatibility; DTSTART is the key property [web:105]
    lines.push(foldLine(`DTSTART:${ev.startLocal}`));
    lines.push(foldLine(`DTEND:${ev.endLocal}`));
    lines.push(foldLine(`SUMMARY:${escText(ev.title)}`));
    lines.push(foldLine(`DESCRIPTION:${escText(ev.description || "")}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
