# План: Redmine Analytics Dashboard

## TL;DR
Создаём веб-приложение Vue.js + FastAPI для аналитики задач из Redmine. Приложение получает данные через REST API Redmine на каждый запрос (без БД), отображает на интерактивном дашборде метрики по времени закрытия задач, времени в статусах и поддерживает многопользовательский доступ с разными API-ключами.

## Архитектура

### Backend (FastAPI)
- Слой для работы с Redmine API
- Бизнес-логика расчёта метрик
- REST endpoints для фронтенда
- Сессионное хранилище API-ключей (в памяти или Redis при масштабировании)

### Frontend (Vue.js + Vuetify)
- Страница аутентификации (ввод URL Redmine + API-ключа)
- Дашборд с выбором проекта и периода
- Компоненты отображения метрик и графиков

### Данные
- Только реальное время через Redmine API
- Никакой постоянной БД
- Кэширование на уровне сессии (опционально)

### Deployment
- Docker контейнер с фронтом + бэком
- Docker Compose для локального запуска

---

## Детальный план реализации

### Фаза 1: Инфраструктура и базовая структура

**Шаг 1.1** - Создать структуру проекта
- `backend/` - Python FastAPI приложение
  - `app/main.py` - точка входа
  - `app/api/` - маршруты
  - `app/services/` - бизнес-логика
  - `app/models/` - Pydantic модели
  - `requirements.txt` - зависимости
  - `Dockerfile` - Docker конфиг
- `frontend/` - Vue.js приложение (npm/vite)
  - `src/pages/` - страницы
  - `src/components/` - компоненты
  - `src/services/` - API клиент
  - `public/` - статика

**Шаг 1.2** - Инициализировать backend
- `pip install fastapi uvicorn pydantic requests python-dotenv`
- Создать FastAPI приложение с CORS
- Настроить переменные окружения

**Шаг 1.3** - Инициализировать frontend
- `npm create vite@latest frontend -- --template vue`
- `npm install vuetify axios moment-js chart.js vue-chartjs`
- Настроить Vite конфиг

**Шаг 1.4** - Создать Docker setup
- `Dockerfile` для backend (Python 3.11+)
- `Dockerfile` для frontend (Node 18+ + nginx)
- `docker-compose.yml` для локального запуска

---

### Фаза 2: Интеграция с Redmine API

**Шаг 2.1** - Создать Redmine API клиент (`backend/app/services/redmine_client.py`)
- Класс `RedmineClient` с методами:
  - `get_projects()` - список проектов
  - `get_issues()` - получить задачи с фильтрами
  - Аутентификация через API-ключ
  - Обработка ошибок и лимиты

**Шаг 2.2** - Реализовать бизнес-логику расчётов (`backend/app/services/analytics.py`)
- Функция расчёта времени закрытия (от created_on до closed_on)
- Функция анализа времени в каждом статусе (требует история changes)
- Функция группировки и фильтрации

**Шаг 2.3** - Создать REST API endpoints:
- `POST /auth/validate` - валидация API-ключа
- `GET /projects` - список проектов (требует auth)
- `POST /analytics` - расчёт метрик (требует auth)
  - Query params: project_id, date_from, date_to, filters (priority, assignee, issue_type)
  - Response: average_close_time, distribution_chart_data, status_times_data

**Шаг 2.4** - Реализовать сессионное хранилище API-ключей
- Простой in-memory store или Redis
- Связь сессии с Redmine URL и API-ключом

---

### Фаза 3: Frontend - Страница аутентификации

**Шаг 3.1** - Создать компонент `LoginPage.vue`
- Форма с полями:
  - Redmine URL (например, https://redmine.example.com)
  - API-ключ
  - Кнопка "Подключиться"
- Валидация полей
- Обработка ошибок (отображение сообщений)
- Сохранение сессии (localStorage или sessionStorage)

**Шаг 3.2** - Создать API клиент (`frontend/src/services/api.js`)
- Axios инстанс с перехватчиками
- Автоматическое добавление сессионного токена
- Обработка 401 ошибок (redirect на login)

**Шаг 3.3** - Добавить роутинг
- Vue Router конфиг
- `/login` - страница входа
- `/dashboard` - защищённый маршрут
- Redirect логика

---

### Фаза 4: Frontend - Основной дашборд

**Шаг 4.1** - Создать главный компонент `DashboardPage.vue`
- Layout с боковой панелью (filters) и основным контентом
- Компоненты:
  - ProjectSelector - выбор проекта (dropdown)
  - DateRangeFilter - выбор периода (date pickers)
  - AdditionalFilters - фильтры по приоритету, исполнителю, типу
  - MetricsDisplay - отображение основных метрик

**Шаг 4.2** - Создать компонент отображения метрик (`MetricsDisplay.vue`)
- 3 основные карточки с KPI:
  - Среднее время закрытия (часы/дни)
  - Медиана времени закрытия
  - Общее количество задач за период
- Структура: Vuetify v-card компоненты с иконками

**Шаг 4.3** - Создать компонент распределения времени закрытия (`ClosureTimeDistributionChart.vue`)
- Bar chart (Chart.js через vue-chartjs)
- X-axis: количество дней (1 день, 2 дня, ..., 30+ дней)
- Y-axis: количество задач
- Интерактивные подсказки (hover)

**Шаг 4.4** - Создать компонент времени в статусах (`StatusTimeChart.vue`)
- Pie chart или horizontal bar chart
- Показывает среднее время в каждом статусе
- Цвет-кодирование по статусам

**Шаг 4.5** - Реализовать логику загрузки данных
- Реактивное обновление при смене фильтров
- Загрузка состояние (loader/spinner)
- Обработка ошибок (error messages)
- Дебаунс запросов при изменении фильтров

---

### Фаза 5: Фильтры и группировка

**Шаг 5.1** - Реализовать фильтры на фронтенде (`FilterPanel.vue`)
- Priority filter (multi-select)
- Assignee filter (multi-select dropdown)
- Issue type filter (multi-select)
- "Применить фильтры" кнопка или реактивное обновление

**Шаг 5.2** - Добавить endpoint на бэке для фильтров
- `GET /filters/priorities` - список приоритетов
- `GET /filters/assignees` - список исполнителей (зависит от проекта)
- `GET /filters/issue_types` - типы задач

**Шаг 5.3** - Реализовать группировку по исполнителям
- Компонент для отображения: "Показать данные по исполнителям" (toggle)
- Если включено: разбивка метрик по каждому исполнителю
- Table или accordion список

---

### Фаза 6: Обработка особых случаев

**Шаг 6.1** - Обработка разных Redmine инстансов
- Поддержка кастомных полей и статусов
- Маппинг "закрытых" статусов (обычно 'Closed', но может быть custom)
- Конфиг: какие статусы считаются "закрытыми"

**Шаг 6.2** - Оптимизация для большого объёма задач
- Пагинация при получении задач из API
- Кэширование результатов на уровне сессии (5-10 минут)
- Лимиты на запросы к Redmine API

**Шаг 6.3** - Обработка ошибок
- Timeout при запросах к Redmine
- Невалидный API-ключ
- Проект/задачи не найдены
- Fallback UI для каждого сценария

---

### Фаза 7: Deployment

**Шаг 7.1** - Создать Dockerfile для backend
- Python 3.11 base image
- Установка зависимостей
- Запуск uvicorn

**Шаг 7.2** - Создать Dockerfile для frontend
- Node 18 для build
- Nginx для serving static файлов
- Проксирование API запросов на backend

**Шаг 7.3** - Создать docker-compose.yml
- 2 сервиса: backend, frontend
- Порты: frontend 3000, backend 8000
- Переменные окружения

**Шаг 7.4** - Документация
- README с инструкциями по запуску
- .env.example с требуемыми переменными
- Примеры конфигурации

---

## Зависимости и инструменты

### Backend
- **FastAPI** - веб-фреймворк
- **Uvicorn** - ASGI сервер
- **Pydantic** - валидация данных
- **Requests** - HTTP клиент для Redmine API
- **Python-dotenv** - конфиг через .env
- **Starlette** - middleware и utilities

### Frontend
- **Vue.js 3** - фреймворк
- **Vite** - build tool
- **Vuetify 3** - UI компоненты (Material Design)
- **Axios** - HTTP клиент
- **Vue Router** - роутинг
- **Chart.js** + **vue-chartjs** - графики
- **Moment.js или date-fns** - работа с датами

### DevOps
- **Docker** - контейнеризация
- **Docker Compose** - орхестрация локально

---

## Файловая структура

```
redmine-analytics/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── analytics.py
│   │   │   └── filters.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── redmine_client.py
│   │   │   └── analytics_engine.py
│   │   └── models/
│   │       ├── __init__.py
│   │       └── schemas.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.vue
│   │   │   └── DashboardPage.vue
│   │   ├── components/
│   │   │   ├── ProjectSelector.vue
│   │   │   ├── DateRangeFilter.vue
│   │   │   ├── FilterPanel.vue
│   │   │   ├── MetricsDisplay.vue
│   │   │   ├── ClosureTimeDistributionChart.vue
│   │   │   └── StatusTimeChart.vue
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── router.js
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Критические дизайн-решения

1. **Без постоянной БД** - требование клиента, упрощает deployment, но требует кэширования на сессию
2. **Многопользовательский** - каждый юзер со своим API-ключом в сессии
3. **API-ключ в сессии** - не в localStorage (более безопасно), требует re-login при refresh
4. **Реальное время** - каждый запрос идёт в Redmine, данные всегда актуальны
5. **Vue.js + Vuetify** - быстрое развитие, хороший UX
6. **Python/FastAPI** - простота, быстрота, хороший для интеграций

---

## Ключевые компоненты и их интеграции

### Редmine API клиент
- Должен обрабатывать пагинацию (большие наборы задач)
- Кэшировать список проектов на сессию
- Логировать и обрабатывать rate limiting

### Analytics Engine
- Преобразовать сырые задачи из Redmine в метрики
- Требует анализа journalized_on (историю изменений) для времени в статусах
- Группировка, фильтрация, расчёты

### API сессии
- Простой dict с сессионным ID → {redmine_url, api_key}
- Или Redis для масштабирования

---

## Верификация

### Backend
1. ✓ Валидация API-ключа и подключение к Redmine
2. ✓ Получение списка проектов
3. ✓ Получение задач с фильтрами
4. ✓ Расчёт метрик (среднее время, распределение)
5. ✓ Фильтры работают корректно
6. ✓ Обработка ошибок и edge cases

### Frontend
1. ✓ Страница login открывается, форма работает
2. ✓ После login переход на dashboard
3. ✓ Дашборд загружает данные при выборе проекта
4. ✓ Фильтры применяются, графики обновляются
5. ✓ UI адаптивен (мобильные устройства)
6. ✓ Обработка ошибок (display error messages)

### Integration
1. ✓ Docker контейнеры запускаются
2. ✓ Frontend может достучаться до backend
3. ✓ Workflow: login → select project → see analytics

---

## Дополнительные возможности (будущее)
- Экспорт в CSV/PDF (требует change requirements)
- Сохранение сохранённых отчётов (требует БД)
- Real-time обновления через WebSockets
- Сравнение периодов
- Более сложные фильтры (custom fields)
