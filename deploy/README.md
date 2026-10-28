# Деплой TasteTrace на VPS

В продакшене снаружи доступен только Caddy (порты 80 и 443): он сам получает HTTPS-сертификат
и отдаёт сайт и API с одного домена. База, бэкенд и фронтенд наружу не открыты.

## Требования

- Ubuntu VPS, от 2 GB RAM
- Домен, у которого DNS-запись **A** указывает на IP сервера
- Открытые входящие порты **80** и **443** (TCP) и **443** (UDP, для HTTP/3)

## Установка

```bash
ssh root@<IP-сервера>
curl -fsSL https://raw.githubusercontent.com/Ant-Tom/TasteTrace/main/deploy/install.sh -o install.sh
DOMAIN=<ваш-домен> ACME_EMAIL=<ваша-почта> bash install.sh
```

Скрипт поставит Docker, склонирует репозиторий в `/opt/tastetrace`, создаст `.env` со случайными
паролями и секретом JWT (права `600`) и запустит всё. Через минуту сайт открывается по `https://<домен>`.

Пока изменения не влиты в `main`, можно ставить из ветки: добавьте `BRANCH=feat/nuxt-migration`.

## Обновление

```bash
cd /opt/tastetrace && git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Миграции базы применяются сами при старте бэкенда.

## Резервные копии

```bash
crontab -e
# каждую ночь в 03:30, хранить 14 дней:
30 3 * * * /opt/tastetrace/deploy/backup.sh >> /var/log/tastetrace-backup.log 2>&1
```

Копии лежат в `/opt/tastetrace-backups`; как восстановить — в начале `deploy/backup.sh`.
Хотя бы раз в неделю переносите их с сервера (на другой сервер или в облако): копия на том же диске
не спасёт, если пропадёт сам сервер.

## Проверка

- Сайт: `https://<домен>`
- API: `https://<домен>/api/establishments`
- Здоровье бэкенда (только изнутри сервера): `docker exec tastetrace-caddy wget -qO- http://backend:8080/actuator/health`
- Логи: `docker logs tastetrace-backend --tail 100`

## Переход со старого сервера (MinIO, порты 5173/8080)

На сервере, где работает старая версия с MinIO:

```bash
cd /opt/tastetrace && git pull
./deploy/migrate-photos-from-minio.sh
docker compose down
echo -e "DOMAIN=<домен>\nACME_EMAIL=<почта>" >> .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`down` нужен, потому что у сети Docker поменялись настройки. Данные в томах сохраняются.
Когда фото на сайте открываются, старые тома можно удалить:
`docker volume rm tastetrace_minio_data tastetrace_redis_data`.
