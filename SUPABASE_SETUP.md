# Пошаговая инструкция: Настройка Supabase для синхронизации

## 🎯 Цель
Настроить Supabase так, чтобы задачи синхронизировались между всеми устройствами пользователя.

---

## Шаг 1: Создание аккаунта и проекта

1. Зайдите на https://supabase.com
2. Нажмите "Start your project"
3. Войдите через GitHub (или создайте аккаунт)
4. Нажмите "New Project"
5. Заполните:
   - **Name**: FlowTask (или любое имя)
   - **Database Password**: придумайте надежный пароль (сохраните его!)
   - **Region**: выберите ближайший регион
6. Нажмите "Create new project"
7. Подождите 2-3 минуты пока проект создается

---

## Шаг 2: Получение ключей API

1. В левом меню выберите **Settings** (шестеренка)
2. Выберите **API**
3. Скопируйте:
   - **Project URL** (например: `https://xxxxx.supabase.co`)
   - **anon public** key (длинная строка)

Эти ключи понадобятся для подключения к Supabase из вашего приложения.

---

## Шаг 3: Создание таблиц в базе данных

1. В левом меню выберите **SQL Editor**
2. Нажмите **New query**
3. Вставьте следующий SQL код:

```sql
-- Включить расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица задач
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица категорий
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

-- Таблица быстрых задач
CREATE TABLE IF NOT EXISTS quick_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_user_id ON quick_tasks(user_id);
```

4. Нажмите **Run** (или Ctrl+Enter)
5. Должно появиться сообщение "Success. No rows returned"

---

## Шаг 4: Настройка Row Level Security (RLS)

RLS гарантирует, что пользователи видят только свои данные.

1. В **SQL Editor** создайте новый запрос
2. Вставьте следующий код:

```sql
-- Включить RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_tasks ENABLE ROW LEVEL SECURITY;

-- Политика для users: пользователи видят только себя
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Политика для tasks: пользователи управляют только своими задачами
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Политика для categories: пользователи управляют только своими категориями
CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Политика для quick_tasks: пользователи управляют только своими быстрыми задачами
CREATE POLICY "Users can manage own quick tasks" ON quick_tasks
  FOR ALL USING (auth.uid()::text = user_id::text);
```

3. Нажмите **Run**

**Важно:** RLS работает только с Supabase Auth. Если вы используете свою систему авторизации, нужно будет настроить политики по-другому.

---

## Шаг 5: Настройка Authentication (опционально)

Если хотите использовать встроенную аутентификацию Supabase:

1. В левом меню выберите **Authentication**
2. Выберите **Providers**
3. Включите **Email** provider
4. Настройте:
   - **Enable email confirmations**: можно отключить для тестирования
   - **Secure email change**: включите для безопасности

---

## Шаг 6: Подключение к приложению

### Вариант A: Через CDN (проще)

1. Откройте `index.html`
2. Добавьте перед закрывающим тегом `</body>`:

```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

3. Создайте файл `js/config.js`:

```javascript
// Конфигурация Supabase
// ЗАМЕНИТЕ на ваши реальные значения!

export const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY_HERE'
};
```

4. В `js/app.js` добавьте инициализацию:

```javascript
import { initSupabase } from './sync-supabase.js';
import { SUPABASE_CONFIG } from './config.js';

// Инициализация Supabase
if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
    initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
}
```

### Вариант B: Через npm (если используете сборщик)

```bash
npm install @supabase/supabase-js
```

---

## Шаг 7: Обновление кода приложения

Нужно обновить модули для работы с Supabase:

1. **js/storage.js** - добавить поддержку HybridStorage
2. **js/auth.js** - использовать Supabase Auth
3. **js/tasks.js** - синхронизировать с Supabase
4. **js/categories.js** - синхронизировать с Supabase

---

## Шаг 8: Тестирование

1. Откройте приложение в браузере
2. Откройте консоль (F12)
3. Проверьте что нет ошибок
4. Зарегистрируйтесь
5. Создайте задачу
6. Проверьте в Supabase Dashboard → Table Editor → tasks, что задача появилась

---

## 🔒 Безопасность

### Важно:
- ✅ **anon key** можно использовать в клиенте (он публичный)
- ❌ **service_role key** НИКОГДА не используйте в клиенте!
- ✅ RLS защищает данные на уровне базы
- ✅ Пароли хешируются Supabase Auth автоматически

---

## 📊 Мониторинг

В Supabase Dashboard можно:
- Смотреть данные в **Table Editor**
- Проверять логи в **Logs**
- Мониторить использование в **Settings → Usage**

---

## 🐛 Решение проблем

### Проблема: "Row Level Security policy violation"
**Решение:** Проверьте что пользователь авторизован и политики RLS настроены правильно

### Проблема: "Invalid API key"
**Решение:** Проверьте что используете правильный anon key, а не service_role key

### Проблема: "relation does not exist"
**Решение:** Убедитесь что таблицы созданы (проверьте в Table Editor)

---

## 📝 Следующие шаги

После настройки Supabase:
1. Обновите код приложения для использования Supabase
2. Протестируйте синхронизацию
3. Добавьте обработку офлайн режима
4. Настройте автоматическую синхронизацию

---

**Готово!** Теперь ваше приложение может синхронизировать данные между устройствами! 🎉

