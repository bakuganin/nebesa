import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { contactDetails } from "@/content/contact";

export const metadata: Metadata = {
  title: "Условия обслуживания | NEBESA",
  description: "Условия оформления заявок, оплаты и оказания ритуальных услуг NEBESA в Нарве.",
};

const sections = [
  {
    title: "1. Общие положения",
    body: [
      `${contactDetails.company} оказывает ритуальные услуги и продает сопутствующие товары под брендом ${contactDetails.brand}. Сайт помогает отправить заявку, уточнить состав услуги и связаться с оператором.`,
      "Размещенная на сайте информация не является публичной офертой. Итоговые условия, сроки, наличие товаров и стоимость подтверждаются оператором после обработки заявки.",
    ],
  },
  {
    title: "2. Оформление заявки",
    body: [
      "Пользователь указывает контактные данные, выбранные услуги или товары, комментарий и при необходимости адрес доставки или место оказания услуги.",
      "После отправки заявки оператор связывается с пользователем для проверки деталей, согласования состава заказа и подтверждения дальнейших действий.",
    ],
  },
  {
    title: "3. Стоимость и оплата",
    body: [
      "Цены на сайте могут быть предварительными и зависят от наличия, комплектации, срочности, доставки и индивидуальных требований.",
      "Способ оплаты, сумма к оплате и документы согласуются с оператором до начала оказания услуги или передачи товара.",
    ],
  },
  {
    title: "4. Изменение или отмена заявки",
    body: [
      "Пользователь может попросить изменить или отменить заявку, связавшись с оператором по телефону или электронной почте.",
      "Если услуга уже начата или товар подготовлен по индивидуальному заказу, условия отмены и возврата согласуются отдельно с учетом фактически понесенных расходов.",
    ],
  },
  {
    title: "5. Ответственность",
    body: [
      "Компания стремится поддерживать точность информации на сайте, но не гарантирует отсутствие технических ошибок, временной недоступности или устаревших данных.",
      "Стороны несут ответственность в пределах, предусмотренных применимым законодательством Эстонии и согласованными условиями конкретного заказа.",
    ],
  },
  {
    title: "6. Контакты",
    body: [
      `Телефон: ${contactDetails.phoneLabel}.`,
      `Email: ${contactDetails.email}.`,
      `Адреса обслуживания: ${contactDetails.addresses.join("; ")}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <Header />
      <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 lg:py-16">
        <nav className="mb-8 text-sm text-moss" aria-label="Навигация">
          <Link href="/" className="hover:text-brass">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <span>Условия обслуживания</span>
        </nav>

        <header className="mb-10">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.08em] text-brass">Юридическая информация</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Условия обслуживания</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-moss">
            Эта редакция нужна для запуска сайта и должна быть проверена юристом перед использованием в качестве
            окончательного текста.
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
