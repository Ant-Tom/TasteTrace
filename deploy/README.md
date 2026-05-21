# Деплой TasteTrace на VPS (Timeweb)

## Требования

- Ubuntu VPS, 4 GB RAM+
- Docker + Git
- Порты **5173** (фронт) и **8080** (API) свободны или открыты в файрволе Timeweb

## Быстрая установка

```bash
ssh root@195.133.40.122

export PUBLIC_HOST=195.133.40.122   # или твой домен
git clone https://github.com/Ant-Tom/TasteTrace.git /opt/tastetrace
cd /opt/tastetrace
chmod +x deploy/install.sh
./deploy/install.sh
```

## Файрвол Timeweb

В панели сервера → **Сеть / Firewall** → открыть входящие TCP **5173**, **8080**.

## Ссылка для теста

`http://195.133.40.122:5173` или `http://6946409-zr912107.twc1.net:5173`

## OpenClaw

Проект ставится в `/opt/tastetrace` с именем compose `tastetrace` — не трогает другие контейнеры.

## Обновление

```bash
cd /opt/tastetrace && git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
