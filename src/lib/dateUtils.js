// Simple date helpers - no external dependencies needed

export function formatDate(date, fmt) {
  const d = new Date(date);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  if (fmt === 'MMMM yyyy') return `${months[d.getMonth()]} ${d.getFullYear()}`;
  if (fmt === 'MMMM d, yyyy') return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (fmt === 'yyyy-MM-dd') {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  if (fmt === 'EEEE') return days[d.getDay()];
  if (fmt === 'dd MMM') return `${String(d.getDate()).padStart(2,'0')} ${shortMonths[d.getMonth()]}`;
  if (fmt === 'd') return String(d.getDate());
  return d.toLocaleDateString();
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function subMonths(date, n) {
  return addMonths(date, -n);
}

export function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0,0,0,0);
  return d;
}

export function endOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23,59,59,999);
  return d;
}

export function startOfWeek(date, opts) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0,0,0,0);
  return d;
}

export function endOfWeek(date, opts) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(23,59,59,999);
  return d;
}

export function eachDayOfInterval({ start, end }) {
  const days = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function isSameMonth(a, b) {
  return new Date(a).getMonth() === new Date(b).getMonth() &&
         new Date(a).getFullYear() === new Date(b).getFullYear();
}

export function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getDate() === db.getDate() &&
         da.getMonth() === db.getMonth() &&
         da.getFullYear() === db.getFullYear();
}

export function isToday(date) {
  return isSameDay(date, new Date());
}

export function getWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
