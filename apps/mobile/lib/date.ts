/** Returns today's date in YYYY-MM-DD format based on local timezone. */
export const getToday = (): string => {
  const d = new Date();
  return formatDateKey(d);
};

export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateStr: string): Date =>
  new Date(`${dateStr}T00:00:00`);

export const addDays = (dateStr: string, days: number): string => {
  const date = parseDateKey(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
};

export const getMonthKey = (dateStr: string): string => dateStr.slice(0, 7);

export const addMonths = (month: string, offset: number): string => {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const getMonthDates = (month: string): string[] => {
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDay = new Date(year, monthIndex - 1, 1);
  const lastDay = new Date(year, monthIndex, 0);
  const dates: string[] = [];

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    dates.push(formatDateKey(new Date(firstDay.getFullYear(), firstDay.getMonth(), day)));
  }

  return dates;
};
