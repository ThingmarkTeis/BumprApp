/**
 * Lightweight iCal parser for extracting VEVENT blocks.
 * Handles Airbnb/Booking.com iCal feeds (DATE type, not DATETIME).
 */

export interface IcalEvent {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  summary: string | null;
}

/**
 * Parse a DATE or DATETIME value from iCal format.
 * Handles: 20260320, 20260320T140000, 20260320T140000Z
 */
function parseIcalDate(value: string): string | null {
  // Strip any TZID prefix
  const clean = value.replace(/^.*:/, "").trim();

  if (clean.length >= 8) {
    const year = clean.slice(0, 4);
    const month = clean.slice(4, 6);
    const day = clean.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Extract a property value from an iCal line.
 * Handles both "DTSTART:20260320" and "DTSTART;VALUE=DATE:20260320"
 */
function getPropertyValue(line: string, property: string): string | null {
  // Match "PROPERTY:" or "PROPERTY;...:"
  const regex = new RegExp(`^${property}[;:](.*)$`, "i");
  const match = line.match(regex);
  if (!match) return null;

  const rest = match[1];
  // If there are parameters (;), the value is after the last ":"
  const colonIndex = rest.lastIndexOf(":");
  if (colonIndex >= 0 && rest.includes(";")) {
    // Line was PROPERTY;params:value — we matched from after PROPERTY
    // rest = "params:value"
    return rest.slice(colonIndex + 1).trim();
  }
  // Line was PROPERTY:value — rest IS the value
  return rest.trim();
}

export function parseIcal(content: string): IcalEvent[] {
  const events: IcalEvent[] = [];

  // Unfold lines (iCal allows line continuations with leading whitespace)
  const unfolded = content.replace(/\r\n[ \t]/g, "").replace(/\r/g, "");
  const lines = unfolded.split("\n");

  let inEvent = false;
  let start: string | null = null;
  let end: string | null = null;
  let summary: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      start = null;
      end = null;
      summary = null;
      continue;
    }

    if (trimmed === "END:VEVENT") {
      if (inEvent && start && end) {
        events.push({ start, end, summary });
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    if (trimmed.startsWith("DTSTART")) {
      const val = getPropertyValue(trimmed, "DTSTART");
      if (val) start = parseIcalDate(val);
    } else if (trimmed.startsWith("DTEND")) {
      const val = getPropertyValue(trimmed, "DTEND");
      if (val) end = parseIcalDate(val);
    } else if (trimmed.startsWith("SUMMARY")) {
      // SUMMARY:Reserved or SUMMARY:Not available
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex >= 0) {
        summary = trimmed.slice(colonIndex + 1).trim();
      }
    }
  }

  return events;
}
