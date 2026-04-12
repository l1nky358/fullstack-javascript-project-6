import fastify from 'fastify';
import view from '@fastify/view';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import pug from 'pug';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { fileURLToPath } from 'url';
import configureAuth from './lib/auth.js';
import routes from './routes.js';
import knexInstance from './config/database.js';
import rollbar from './lib/rollbar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = fastify({
  logger: true,
});

// Встроенный парсер для application/x-www-form-urlencoded
app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, function (req, body, done) {
  try {
    const params = new URLSearchParams(body);
    const parsed = {};
    for (const [key, value] of params) {
      if (key.includes('[')) {
        const match = key.match(/^(\w+)\[(\w+)\]$/);
        if (match) {
          const [, obj, field] = match;
          if (!parsed[obj]) parsed[obj] = {};
          parsed[obj][field] = value;
        }
      } else {
        parsed[key] = value;
      }
    }
    done(null, parsed);
  } catch (err) {
    rollbar.error('Error parsing form body', err);
    done(err);
  }
});

// Глобальный обработчик ошибок с Rollbar
app.setErrorHandler((error, request, reply) => {
  // Логируем ошибку в Rollbar
  rollbar.error(error, {
    request: {
      method: request.method,
      url: request.url,
      body: request.body,
      params: request.params,
      query: request.query,
      headers: request.headers,
    },
    user: request.user ? {
      id: request.user.id,
      email: request.user.email,
    } : null,
  });

  // Логируем в консоль для разработки
  app.log.error(error);

  // Отправляем ответ пользователю
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    statusCode,
    error: error.message || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Произошла ошибка на сервере. Администратор уже уведомлен.'
      : error.message,
  });
});

// Graceful shutdown
process.on('uncaughtException', (error) => {
  rollbar.critical('Uncaught Exception', error);
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  rollbar.critical('Unhandled Rejection', { reason, promise });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Настройка i18n
await i18next
  .use(Backend)
  .init({
    initImmediate: false,
    fallbackLng: 'en',
    lng: 'en',
    preload: ['en', 'ru'],
    backend: {
      loadPath: path.join(__dirname, 'locales', '{{lng}}', 'translation.json'),
    },
  });

const t = (key) => i18next.t(key);

// Настройка сессий
app.register(cookie);
app.register(session, {
  secret: process.env.SESSION_SECRET || 'my-super-secret-key-that-is-at-least-32-chars-long',
  cookie: { secure: false, httpOnly: true },
  saveUninitialized: false,
});

// Flash middleware
app.addHook('preHandler', (request, reply, done) => {
  if (!request.session.flash) {
    request.session.flash = {};
  }
  reply.flash = (type, message) => {
    request.session.flash[type] = message;
  };
  reply.locals = reply.locals || {};
  reply.locals.flash = request.session.flash;
  reply.locals.user = request.user;
  reply.locals.t = t;
  request.t = t;
  const flash = { ...request.session.flash };
  request.session.flash = {};
  reply.locals.flash = flash;
  done();
});

app.addHook('preHandler', (request, reply, done) => {
  if (request.body && request.body._method) {
    request.method = request.body._method;
  }
  done();
});

// Настройка шаблонов
app.register(view, {
  engine: { pug },
  root: path.join(__dirname, 'views'),
  viewExt: 'pug',
  defaultContext: {
    currentYear: new Date().getFullYear(),
    user: null,
    t: t,
  },
});

// Аутентификация
await configureAuth(app);

// Маршруты
app.register(routes);

// Миграции
if (process.env.NODE_ENV !== 'production') {
  await knexInstance.migrate.latest();
}

export default app;