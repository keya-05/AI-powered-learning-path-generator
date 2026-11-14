const dayFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const DAY = 24 * 60 * 60 * 1000;

// "Due today, 11:59 PM" / "Due in 3 days" / "Due 20 Nov" / "Overdue by 2 days".
export function dueLabel(dueAt, now = new Date()) {
  if (!dueAt) return "No due date";
  const due = new Date(dueAt);
  const diff = due - now;
  if (diff < 0) {
    // Count calendar days, so something due late last night reads as a day overdue.
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const days = Math.round((startOfDay(now) - startOfDay(due)) / DAY);
    return days === 0 ? "Due earlier today" : `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  }
  const sameDay = due.toDateString() === now.toDateString();
  if (sameDay) return `Due today, ${timeFormatter.format(due)}`;
  const days = Math.ceil(diff / DAY);
  if (days <= 7) return `Due in ${days} day${days === 1 ? "" : "s"}`;
  return `Due ${dayFormatter.format(due)}`;
}

export function isOverdue(dueAt, now = new Date()) {
  return Boolean(dueAt) && new Date(dueAt) < now;
}
