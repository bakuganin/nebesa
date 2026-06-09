export function formatCurrency(cents: number | null | undefined, currency = "EUR"): string {
  if (typeof cents !== "number") {
    return "Цена по запросу";
  }

  return new Intl.NumberFormat("ru-EE", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("ru-EE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPhoneForTel(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}
