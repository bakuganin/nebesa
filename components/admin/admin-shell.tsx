import {
  BarChart3,
  Bot,
  ClipboardList,
  FileText,
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { AdminAccessState } from "@/features/admin/access";

import { LogoutButton } from "./logout-button";

const navGroups = [
  {
    title: "Работа",
    items: [
      { href: "/admin", label: "Обзор", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Заказы", icon: ClipboardList },
      { href: "/admin/products", label: "Товары", icon: Package },
      { href: "/admin/categories", label: "Категории", icon: FolderTree },
    ],
  },
  {
    title: "Операции",
    items: [
      { href: "/admin/documents", label: "Документы", icon: FileText },
      { href: "/admin/bot", label: "WhatsApp бот", icon: Bot },
      { href: "/admin/analytics", label: "Аналитика", icon: BarChart3 },
    ],
  },
  {
    title: "Настройки",
    items: [
      { href: "/admin/settings/users", label: "Пользователи", icon: ShieldCheck },
      { href: "/admin/settings/audit-log", label: "Журнал", icon: Settings },
    ],
  },
];

function accessLabel(access: AdminAccessState): string {
  if (access.status === "ready") {
    return `Роль: ${access.profile.role}`;
  }

  if (access.status === "not_configured") {
    return "Нужна конфигурация";
  }

  if (access.status === "unauthenticated") {
    return "Вход не выполнен";
  }

  return "Доступ ограничен";
}

function MobileNav() {
  return (
    <div className="flex max-w-full gap-2 overflow-x-auto px-3 pb-4 lg:hidden">
      {navGroups.flatMap((group) =>
        group.items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-[#d8dedc] bg-[#f7f9f8] px-3 text-sm font-medium text-[#2f3935] outline-none focus-visible:ring-2 focus-visible:ring-[#59685e]/30"
            >
              <Icon aria-hidden="true" className="h-4 w-4 text-[#59685e]" />
              {item.label}
            </Link>
          );
        }),
      )}
    </div>
  );
}

function DesktopNav() {
  return (
    <nav className="hidden gap-5 px-3 pb-5 lg:grid">
      {navGroups.map((group) => (
        <div key={group.title}>
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7671]">
            {group.title}
          </div>
          <div className="grid gap-1">
            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[#2f3935] outline-none transition hover:bg-[#eef2f0] focus-visible:ring-2 focus-visible:ring-[#59685e]/30"
                >
                  <Icon aria-hidden="true" className="h-4 w-4 text-[#59685e]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({
  access,
  children,
}: {
  access: AdminAccessState;
  children: ReactNode;
}) {
  if (access.status !== "ready") {
    return (
      <div className="min-h-screen bg-[#f4f6f5] px-4 py-8 text-[#1f2528] sm:px-6">
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center">
          <Link href="/" className="mb-6 w-fit rounded-sm text-sm font-semibold uppercase tracking-[0.18em] text-[#59685e] outline-none focus-visible:ring-2 focus-visible:ring-[#59685e]/30">
            NEBESA
          </Link>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-[#1f2528]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="min-w-0 border-b border-[#d8dedc] bg-white lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 px-5 py-5">
            <div>
              <Link href="/admin" className="rounded-sm text-lg font-semibold tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-[#59685e]/30">
                NEBESA Панель
              </Link>
              <div className="mt-1 text-xs text-[#59685e]">{accessLabel(access)}</div>
            </div>
            <LogoutButton />
          </div>
          <MobileNav />
          <DesktopNav />
        </aside>
        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
