# Redmine Analytics Dashboard

Дашборд аналитики для системы управления задачами Redmine. Отображает метрики времени закрытия задач, переходов по статусам и аналитику производительности.

## Возможности

- 🔐 Безопасная аутентификация через API-ключ Redmine
- 📊 Аналитика и метрики в реальном времени
- 📈 Интерактивные графики и визуализации
- 🎯 Фильтрация по проекту, приоритету, исполнителю и типу задачи
- 👥 Группировка аналитики по исполнителям
- 🚀 Поддержка нескольких пользователей
- 🐳 Поддержка Docker для простого развёртывания

## Технологический стек

### Бэкенд
- **FastAPI** — веб-фреймворк на Python
- **Uvicorn** — ASGI-сервер
- **Pydantic** — валидация данных
- **Requests** — HTTP-клиент

### Фронтенд
- **Vue.js 3** — JavaScript-фреймворк
- **Vuetify** — компоненты Material Design
- **Chart.js** — графики и визуализации
- **Vite** — сборочный инструмент

## Быстрый старт

### Docker Compose (рекомендуется)

```bash
# Сборка и запуск (production-режим)
docker compose up -d --build

# Фронтенд: http://localhost:3000
# Бэкенд API: http://localhost:8000

# Остановка
docker compose down
```

### Ручная настройка (без Docker)

#### Бэкенд

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd backend
uvicorn app.main:app --reload --port 8000
# Бэкенд: http://localhost:8000
```

#### Фронтенд

```bash
cd frontend
npm install
npm run dev
# Фронтенд: http://localhost:5173
```

## Конфигурация

### Бэкенд (.env)

```
DEBUG=true
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
SESSION_TIMEOUT_MINUTES=60
```

### Фронтенд (.env)

```
VITE_API_URL=http://localhost:8000
```

## Использование

1. **Вход**: введите URL Redmine и API-ключ
2. **Выбор проекта**: выберите проект для анализа
3. **Настройка фильтров**:
   - Диапазон дат (с/по)
   - Приоритеты
   - Исполнители
   - Типы задач
4. **Просмотр аналитики**:
   - Среднее и медианное время закрытия
   - График распределения времени закрытия
   - Время в каждом статусе
   - Метрики с группировкой по исполнителям (опционально)

## API-эндпоинты

### Аутентификация
- `POST /auth/validate` — проверить учётные данные и создать сессию
- `POST /auth/logout` — завершить сессию

### Проекты
- `GET /projects` — получить список проектов

### Аналитика
- `POST /analytics` — получить метрики аналитики
- `GET /analytics/filters/priorities` — получить доступные приоритеты
- `GET /analytics/filters/issue_types` — получить доступные типы задач
- `GET /analytics/filters/assignees` — получить исполнителей проекта
- `GET /analytics/by_assignee` — получить аналитику с группировкой по исполнителям

## Сборка для production

### Бэкенд
```bash
# Сборка Docker-образа
docker build -f Dockerfile.backend -t redmine-analytics-backend .

# Запуск
docker run -p 8000:8000 redmine-analytics-backend
```

### Фронтенд
```bash
cd frontend

# Сборка статических файлов
npm run build

# Результат в директории dist/
```

## Обработка ошибок

Приложение обрабатывает:
- Неверные учётные данные API
- Таймауты сети
- Ошибки Redmine API
- Отсутствующие данные
- Истечение сессии

## Известные ограничения

- Нет постоянного хранилища данных (только сессионное)
- Зависимость от ограничений частоты запросов Redmine API
- Данные запрашиваются при каждом обращении (без кеширования)
- Развёртывание в одном экземпляре (без масштабирования)

## Планы по развитию

- [ ] Экспорт в CSV/PDF
- [ ] Синхронизация данных в реальном времени через WebSockets
- [ ] Сравнение периодов
- [ ] Поддержка пользовательских полей
- [ ] Сохранение отчётов и планирование
- [ ] Интеграция LDAP/SSO
- [ ] Слой кеширования (Redis)

## Устранение неполадок

### Ошибка «Invalid API key»
- Проверьте правильность URL Redmine (например, https://redmine.example.com)
- Проверьте, что API-ключ действителен в настройках пользователя Redmine
- Убедитесь, что Redmine доступен из приложения

### Графики не отображаются
- Проверьте консоль браузера на наличие ошибок
- Проверьте загрузку данных во вкладке Network инструментов разработчика
- Очистите кеш браузера и перезагрузите страницу

### Ошибки CORS
- Убедитесь, что `CORS_ORIGINS` в `.env` бэкенда содержит адрес вашего фронтенда
- При использовании Docker проверьте, что nginx проксирует запросы `/api/` на бэкенд
- В режиме разработки проверьте настройки прокси в `vite.config.js`
- Check CORS_ORIGINS in backend .env
- Ensure frontend URL is in CORS whitelist
- Backend must be running on correct host/port

## Development

### Project Structure

```
redmine-analytics/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── services/     # Business logic
│   │   ├── models/       # Pydantic schemas
│   │   └── main.py       # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   └── services/     # API client
│   ├── index.html
│   └── package.json
└── docker-compose.yml
```

## License

MIT
