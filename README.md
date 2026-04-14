# Task Manager (JS)
[![Maintainability](https://api.codeclimate.com/v1/badges/YOUR_PROJECT_ID/maintainability)](https://codeclimate.com/github/YOUR_USERNAME/fullstack-javascript-project-6/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/YOUR_PROJECT_ID/test_coverage)](https://codeclimate.com/github/YOUR_USERNAME/fullstack-javascript-project-6/test_coverage)
[![Actions Status](https://github.com/l1nky358/fullstack-javascript-project-6/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/l1nky358/fullstack-javascript-project-6/actions)
[Vercel deploy](fullstack-javascript-project-6-pecpwzer1-l1nky358s-projects.vercel.app)
## Описание

Task Manager - это система управления задачами, построенная на Fastify. Позволяет создавать задачи, назначать исполнителей, управлять статусами и метками.

## Функциональность

- ✅ Аутентификация и регистрация пользователей
- ✅ Управление пользователями (CRUD)
- ✅ Управление статусами задач (CRUD)
- ✅ Управление метками (CRUD)
- ✅ Управление задачами (CRUD)
- ✅ Фильтрация задач по статусу, исполнителю, метке и автору
- ✅ Мониторинг ошибок через Rollbar

## Технологии

- **Backend**: Fastify 4.x
- **ORM**: Objection.js + Knex
- **Шаблонизатор**: Pug
- **База данных**: PostgreSQL (production), SQLite (development)
- **Аутентификация**: Session-based with bcrypt
- **Мониторинг**: Rollbar
- **Тестирование**: Node.js native test runner
- **Линтер**: ESLint

## Требования

- Node.js >= 18.x
- npm >= 9.x

## Установка и запуск

```bash
# Клонирование репозитория
git clone https://github.com/YOUR_USERNAME/fullstack-javascript-project-6.git
cd fullstack-javascript-project-6

# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env файл

# Запуск миграций
npm run migrate

# Запуск в режиме разработки
npm run dev

# Запуск в продакшене
npm start
