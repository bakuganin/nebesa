# NEBESA deployment checklist

Этот документ фиксирует минимальные шаги для запуска Next.js версии сайта. Значения секретов не хранить в git, логах,
скриншотах, документации или клиентском коде.

## Environment variables

Public values:

- `NEXT_PUBLIC_SITE_URL` - публичный URL сайта, например production-домен.
- `NEXT_PUBLIC_SUPABASE_URL` - URL проекта Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon key Supabase для публичных чтений и auth flows.

Server-only values:

- `DATABASE_URL` - строка подключения к Postgres для миграций или CI, если используется напрямую.
- `SUPABASE_DB_PASSWORD` - пароль базы Supabase, если нужен выбранному deployment flow.
- `SUPABASE_SERVICE_ROLE_KEY` - service-role key только для route handlers/server actions.
- `RESEND_API_KEY` - optional API key Resend для email-уведомлений о новых заявках.
- `ORDER_EMAIL_FROM` - optional verified sender в Resend, например `NEBESA <orders@example.com>`.
- `ORDER_EMAIL_TO` - optional email получателей заявок, несколько адресов через запятую.
- `WA_PHONE_NUMBER_ID` - WhatsApp Cloud API phone number id.
- `WA_BUSINESS_ACCOUNT_ID` - WhatsApp Business Account id для операторских проверок.
- `WA_ACCESS_TOKEN` - WhatsApp Cloud API access token.
- `WA_TRUSTED_PHONE` - номер оператора или служебного чата для уведомлений о заказах.
- `WA_VERIFY_TOKEN` - произвольный verify token для проверки webhook в Meta.
- `WA_APP_SECRET` - App Secret из Meta, нужен для проверки `X-Hub-Signature-256`.

Перед production запуском проверить, что server-only значения не попали в browser bundle:

```bash
npm run build
rg "SUPABASE_SERVICE_ROLE_KEY|WA_ACCESS_TOKEN|WA_APP_SECRET" .next/static
```

Команда `rg` не должна находить значения или имена секретных переменных в клиентских чанках.

## Supabase migration and seed

1. Создать Supabase project и включить Postgres extensions, используемые миграциями.
2. Применить все SQL-файлы из `supabase/migrations/` по порядку имени. Для существующей базы важно применить и поздние миграции, включая checkout inventory и request-only checkout:

```bash
for file in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done
```

Если используется Supabase CLI, эквивалентный вариант - `supabase db push` после link проекта.
3. Запустить импорт каталога:

```bash
npm run extract:catalog
```

4. Загрузить базовые категории/товары выбранным seed/import workflow.
5. Опубликовать актуальные статусы, цены, варианты и опции каталога из seed:

```bash
npm run publish:catalog
```

6. Проверить, что `publish:catalog` завершился без `failures`, а `publicCount` соответствует ожидаемому опубликованному каталогу.
7. После импорта оставить review-required товары закрытыми до ручной проверки названий, цен, изображений и категорий.
8. Создать первого владельца через admin bootstrap flow, затем проверить, что last-owner protection работает.

## WhatsApp setup and token rotation

1. В Meta настроить webhook URL:

```text
https://<domain>/api/whatsapp/webhook
```

2. В качестве verify token указать то же значение, что и в `WA_VERIFY_TOKEN`.
3. Подписать webhook на события сообщений и статусов.
4. Убедиться, что `WA_APP_SECRET` заполнен: POST webhook без корректной `X-Hub-Signature-256` должен получать `401`.
5. Для локального временного токена помнить ограничение по сроку жизни. Если токен действует около 24 часов, после истечения
   заменить `WA_ACCESS_TOKEN` и перезапустить runtime.
6. Для production выпустить постоянный WhatsApp token с минимально нужными правами и завести календарь ротации.
7. Ошибка WhatsApp не должна ломать заказ: order creation сохраняет заказ, а уведомление возвращает `failed` или `skipped`
   с prefilled WhatsApp fallback URL.

## QA commands

Narrow checks for this integration:

```bash
npm test -- tests/api/whatsapp.test.ts
npm run typecheck
npm run build
```

Migration checks:

```bash
node scripts/audit-legacy-assets.mjs
npm run extract:catalog
npm run test:e2e
```

Browser QA before release:

- `/`, `/faq`, each `/services/<slug>` route on desktop and mobile widths.
- `/terms`, `/privacy`, `/cookies`, `/gallery` render without missing local images.
- `/api/whatsapp/webhook` GET challenge succeeds only with the configured verify token.
- Signed WhatsApp POST returns `202`; missing or tampered signatures return `401`.
- Checkout order creation still succeeds when WhatsApp env is missing or token is expired.
- Checkout order creation still succeeds when email env is missing; email channel records `skipped`.

## Legal copy note

The Russian legal pages are launch copy, not legal advice. Before production, counsel should review:

- company details and jurisdiction;
- terms for cancellation, refunds, and custom goods;
- retention periods and processor list in the privacy policy;
- cookie consent requirements if analytics, ads, chat widgets, or tracking pixels are added.
