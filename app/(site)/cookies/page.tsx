import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { contactDetails } from "@/content/contact";

export const metadata: Metadata = {
  title: "Cookie | NEBESA",
  description: "Информация о cookie и техническом хранении данных на сайте NEBESA.",
};

const sections = [
  {
    title: "1. Что такое cookie",
    body: [
      "Cookie - это небольшие файлы или записи в браузере, которые помогают сайту работать корректно, запоминать техническое состояние и защищать формы от злоупотреблений.",
      "Похожие технологии могут использоваться для локального хранения корзины, выбранных параметров и служебных настроек интерфейса.",
    ],
  },
  {
    title: "2. Какие cookie могут использоваться",
    body: [
      "Необходимые cookie нужны для работы сайта, безопасности, отправки форм, авторизации администратора и сохранения пользовательского выбора в рамках текущего посещения.",
      "Аналитические или маркетинговые cookie не должны включаться без отдельной настройки и проверки согласия пользователя.",
    ],
  },
  {
    title: "3. Управление cookie",
    body: [
      "Пользователь может ограничить или удалить cookie в настройках браузера. Некоторые функции сайта после этого могут работать нестабильно.",
      "Если на сайте будут подключены дополнительные аналитические сервисы, текст этой страницы и механизм согласия нужно обновить до публикации.",
    ],
  },
  {
    title: "4. Контакты",
    body: [
      `По вопросам cookie и обработки данных можно написать на ${contactDetails.email} или позвонить ${contactDetails.phoneLabel}.`,
    ],
  },
];

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <Header />
      <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 lg:py-16">
        <nav className="mb-8 text-sm text-moss" aria-label="Навигация">
          <Link href="/" className="hover:text-brass">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <span>Cookie</span>
        </nav>

        <header className="mb-10">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.08em] text-brass">Настройки браузера</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Cookie и локальное хранение</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-moss">
            Эта страница фиксирует текущую техническую модель и должна быть обновлена при подключении аналитики,
            рекламы или сторонних виджетов.
          </p>
        </header>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="border-t border-black/10 pt-6">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="mt-4 space-y-3 text-base leading-7 text-ink/80">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
