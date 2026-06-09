export function formatMoney(cents: number | null | undefined, currency = "EUR"): string {
  if (typeof cents !== "number") {
    return "По запросу";
  }

  return new Intl.NumberFormat("ru-EE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-EE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("ru-EE").format(value);
}

export const productStatusLabels: Record<string, string> = {
  draft: "Черновик",
  active: "Активен",
  inactive: "Скрыт",
  archived: "Архив",
};

export const productVisibilityLabels: Record<string, string> = {
  private: "Приватно",
  public: "Публично",
};

export const orderModeLabels: Record<string, string> = {
  disabled: "Без заказа",
  priced: "В корзину",
  inquiry_only: "Заявка",
};

export const orderStatusLabels: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтвержден",
  in_progress: "В работе",
  completed: "Завершен",
  cancelled: "Отменен",
};

export const notificationStatusLabels: Record<string, string> = {
  pending: "Ожидает",
  sent: "Отправлено",
  failed: "Ошибка",
  skipped: "Пропущено",
};
