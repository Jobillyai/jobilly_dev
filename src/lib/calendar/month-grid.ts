export type CalendarDay = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    date.setHours(0, 0, 0, 0);

    days.push({
      date,
      dateKey: toDateKey(date),
      isCurrentMonth: date.getMonth() === month,
      isToday: date.getTime() === today.getTime(),
    });
  }

  return days;
}

export function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

export function getSessionDateKey(
  sessionScheduledAt: string | null,
  fallback: string,
): string {
  const value = sessionScheduledAt ?? fallback;
  return toDateKey(new Date(value));
}
