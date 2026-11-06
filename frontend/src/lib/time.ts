// frontend/src/lib/time.ts
const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "YYYY-MM-DDTHH:mm" on the phone's own clock, the same shape the parser produces. */
export function toLocalStamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseStamp(stamp: string) {
  const [date, time] = stamp.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return { y, m, d, h, min };
}

/** "Today, 9:33 AM", "Yesterday, 7:32 PM", "Monday, 8:55 PM", "30 Apr, 8:01 AM" */
export function formatStamp(stamp: string, now = new Date()): string {
  const { y, m, d, h, min } = parseStamp(stamp);
  const time = `${h % 12 || 12}:${pad(min)} ${h < 12 ? 'AM' : 'PM'}`;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(y, m - 1, d);
  const daysAgo = Math.round((today.getTime() - day.getTime()) / 86400000);

  if (daysAgo === 0) return `Today, ${time}`;
  if (daysAgo === 1) return `Yesterday, ${time}`;
  if (daysAgo > 1 && daysAgo < 7) return `${WEEKDAYS[day.getDay()]}, ${time}`;
  const year = y === now.getFullYear() ? '' : ` ${y}`;
  return `${d} ${MONTHS[m - 1]}${year}, ${time}`;
}