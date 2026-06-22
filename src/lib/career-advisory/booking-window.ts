export const MAX_BOOKING_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const MIN_BOOKING_BUFFER_MS = 60 * 60 * 1000;

export type BookingWindow = {
  min: Date;
  max: Date;
};

export function getBookingWindow(from = new Date()): BookingWindow {
  const min = new Date(from.getTime() + MIN_BOOKING_BUFFER_MS);
  min.setSeconds(0, 0);

  const max = new Date(from.getTime() + MAX_BOOKING_WINDOW_MS);
  max.setSeconds(0, 0);

  return { min, max };
}

export function formatDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-") +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function validateSessionBookingTime(
  sessionStart: Date,
  from = new Date(),
): { valid: true } | { valid: false; message: string } {
  if (Number.isNaN(sessionStart.getTime())) {
    return { valid: false, message: "Choose a valid session date and time." };
  }

  const { min, max } = getBookingWindow(from);

  if (sessionStart.getTime() < min.getTime()) {
    return {
      valid: false,
      message: "Choose a session at least 1 hour from now.",
    };
  }

  if (sessionStart.getTime() > max.getTime()) {
    return {
      valid: false,
      message: "Sessions can only be booked within the next 2 days.",
    };
  }

  return { valid: true };
}

export function parseSessionScheduledInput(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
