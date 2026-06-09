import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { contactDetails } from "@/content/contact";

export const metadata: Metadata = {
  title: "Политика конфиденциальности | NEBESA",
  description: "Как NEBESA обрабатывает контактные данные, заявки и служебную информацию сайта.",
};

const sections = [
  {
    title: "1. Какие данные мы получаем",
    body: [
      "При отправке заявки сайт может получать имя, номер телефона, email, адрес доставки или оказания услуги, состав заказа и комментарии пользователя.",
      "Также могут обрабатываться технические данные: IP-адрес, сведения о браузере, дата и время обращения, ошибки формы и служебные журналы безопасности.",
    ],
  },
  {
    title: "2. Зачем используются данные",
    body: [
      "Данные используются для обработки заявки, связи с пользователем, подготовки заказа, оказания услуг, ведения учета, предотвращения злоупотреблений и выполнения законных обязанностей компании.",
      "Контактные данные могут использоваться для уведомлений по заявке, включая звонок, email или сообщение оператору через WhatsApp.",
    ],
  },
  {
    title: "3. Хранение и доступ",
    body: [
      "Доступ к заявкам и служебным журналам предоставляется только сотрудникам и подрядчикам, которым это необходимо для работы с заказом или поддержки сайта.",
      "Срок хранения зависит от характера заявки, бухгалтерских требований и операционных потребностей. Данные удаляются или обезличиваются, когда больше не нужны.",
    ],
  },
  {
    title: "4. Передача третьим лицам",
    body: [
      "Данные могут передаваться поставщикам инфраструктуры, платежным или коммуникационным сервисам, если это необходимо для работы сайта и обработки заявки.",
      "Компания не продает персональные данные и не передает их для сторонней рекламы.",
    ],
  },
  {
    title: "5. Права пользователя",
    body: [
      "Пользователь может запросить доступ к своим данным, исправление, удаление или ограничение обработки, если это не противоречит законным обязательствам компании.",
      `Для запроса напишите на ${contactDetails.email} или позвоните ${contactDetails.phoneLabel}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <Header />
      <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 lg:py-16">
        <nav className="mb-8 text-sm text-moss" aria-label="Навигация">
          <Link href="/" className="hover:text-brass">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <span>Политика конфиденциальности</span>
        </nav>

        <header className="mb-10">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.08em] text-brass">Персональные данные</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Политика конфиденциальности</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-moss">
            Текст описывает предполагаемую обработку данных на сайте и требует юридической проверки перед публикацией
            как окончательной политики.
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
