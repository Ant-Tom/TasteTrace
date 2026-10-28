# Деплой TasteTrace на VPS

## Требования

- Ubuntu VPS, 4 GB RAM+
- Docker + Git
- Порты **5173** (фронт) и **8080** (API) свободны или открыты в файрволе

## Быстрая установка

```bash
ssh root@<IP-сервера>

export PUBLIC_HOST=<IP-сервера или домен>
git clone https://github.com/Ant-Tom/TasteTrace.git /opt/tastetrace
cd /opt/tastetrace
chmod +x deploy/install.sh
./deploy/install.sh
```

Скрипт сам создаст `.env` со случайными паролями и секретом JWT.

## Файрвол

В панели хостинга открыть входящие TCP **5173** и **8080**.

## Проверка

Сайт: `http://<PUBLIC_HOST>:5173`, API: `http://<PUBLIC_HOST>:8080/api/establishments`.

## Соседние проекты

Проект ставится в `/opt/tastetrace` с именем compose `tastetrace` и не трогает другие контейнеры на сервере.

## Обновление

```bash
cd /opt/tastetrace && git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
