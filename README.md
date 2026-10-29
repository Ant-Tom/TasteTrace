# Где поесть

Гастрокарта Казани: кафе и рестораны на карте, рейтинги, отзывы с фото и лайками.
Технические имена (репозиторий, пакеты Java, контейнеры и тома Docker) остались `tastetrace`,
чтобы не ломать уже развёрнутые серверы.

## Из чего состоит

| Папка | Что внутри |
|---|---|
| `frontend/` | Сайт на Nuxt 4 (Vue 3, Pinia, Tailwind, MapLibre GL). Каждое заведение — страница `/place/:id` с серверным рендерингом. |
| `backend/` | API на Java 21 + Spring Boot 3: авторизация (JWT + refresh-токены), заведения, отзывы, фото. Схема БД — миграции Flyway в `src/main/resources/db/migration`. |
| `scripts/` | Python-скрипты, которые собирают SQL-миграции с заведениями из выгрузки 2ГИС (`scripts/data`). |
| `deploy/` | Установка на VPS одной командой (Caddy + HTTPS), резервные копии — см. [deploy/README.md](deploy/README.md). |

Инфраструктура в `docker-compose.yml`: только PostgreSQL. Фото отзывов лежат файлами в Docker-томе `photos_data` (вне Docker — в `backend/data/photos`).

## Быстрый старт

```bash
cp .env.example .env
docker compose up -d --build
```

Сайт — http://localhost:5173, API — http://localhost:8080/api/establishments.

## Запуск без Docker

Бэкенд вместе с настоящим PostgreSQL (база поднимается из встроенных бинарников, данные — в `backend/data/pg`):

```bash
cd backend
mvn spring-boot:test-run -Dspring-boot.run.main-class=com.tastetrace.LocalDevApplication
```

Сайт — в соседнем терминале (порт 5173 разрешён в CORS по умолчанию):

```bash
cd frontend
npm install && npm run build
NUXT_PUBLIC_API_URL=http://localhost:8080 PORT=5173 node .output/server/index.mjs
```

## Разработка без Docker для фронтенда

```bash
cd frontend
npm install
NUXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```

Проверка типов: `npm run typecheck`.

## Тесты бэкенда

```bash
cd backend
mvn test
```

Интеграционные тесты поднимают настоящий PostgreSQL сами (embedded-postgres), Docker не нужен.
Сейчас в `pom.xml` подключены бинарники PostgreSQL для macOS на Apple Silicon; для Linux/CI
добавьте `embedded-postgres-binaries-linux-amd64`.

## Основные переменные окружения

| Переменная | Зачем |
|---|---|
| `JWT_SECRET` | Подпись access-токенов. В продакшене — длинная случайная строка. |
| `PUBLIC_API_URL` | Адрес API, который видит браузер. |
| `CORS_ALLOWED_ORIGINS` | Адрес сайта, которому разрешено обращаться к API. |
| `TRUSTED_PROXIES` | IP обратного прокси перед бэкендом; без прокси оставить пустым. |
| `NUXT_PUBLIC_SITE_URL` | Публичный адрес сайта для sitemap, канонических ссылок и превью (в продакшене ставится сам из `DOMAIN`). |
| `NUXT_PUBLIC_MAP_STYLE_URL` | Стиль карты (по умолчанию тёмные тайлы OpenFreeMap). |

Полный список — в [.env.example](.env.example).
