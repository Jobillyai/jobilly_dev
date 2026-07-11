import {
  formatSessionDateTimeForCandidate,
  formatSessionDateTimeForStaffHtml,
} from "@/lib/career-advisory/session-datetime";

const SESSION_DURATION_MINUTES = 45;

/**
 * @deprecated Use candidate-selected booking time instead.
 */
export function getNextAdvisorySessionTime(from = new Date()): Date {
  const scheduled = new Date(from.getTime() + 48 * 60 * 60 * 1000);
  scheduled.setMinutes(0, 0, 0);
  scheduled.setSeconds(0, 0);

  if (scheduled.getTime() <= from.getTime()) {
    scheduled.setHours(scheduled.getHours() + 1);
  }

  return scheduled;
}

export function getSessionEndTime(start: Date): Date {
  return new Date(start.getTime() + SESSION_DURATION_MINUTES * 60 * 1000);
}

function formatIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildCareerAdvisoryIcsInvite(input: {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  meetUrl: string;
  sessionStart: Date;
  sessionEnd: Date;
  organizerEmail: string;
}): string {
  const uid = `career-advisory-${input.candidateId}@jobilly.ai`;
  const description = escapeIcsText(
    `Your Jobilly career advisory session.\\n\\nJoin Google Meet: ${input.meetUrl}`,
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jobilly.ai//Career Advisory//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(input.sessionStart)}`,
    `DTEND:${formatIcsUtc(input.sessionEnd)}`,
    "SUMMARY:Jobilly Career Advisory Session",
    `DESCRIPTION:${description}`,
    `LOCATION:${input.meetUrl}`,
    `ORGANIZER;CN=Jobilly.ai:mailto:${input.organizerEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${escapeIcsText(input.candidateName)}:mailto:${input.candidateEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** @deprecated Use formatSessionDateTimeForCandidate instead. */
export function formatSessionDateTime(date: Date): string {
  return formatSessionDateTimeForCandidate(date);
}

export { formatSessionDateTimeForStaffHtml } from "@/lib/career-advisory/session-datetime";
