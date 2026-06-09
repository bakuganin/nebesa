export function safeAdminRedirect(next: string | string[] | null | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;

  if (value?.startsWith("/admin") && !value.startsWith("/admin/login")) {
    return value;
  }

  return "/admin";
}
