export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function toYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatUrgencyLabel(value: 'NORMAL' | 'IMPORTANT' | 'DEADLINE') {
  switch (value) {
    case 'DEADLINE':
      return 'Deadline';
    case 'IMPORTANT':
      return 'Important';
    default:
      return 'Normal';
  }
}
