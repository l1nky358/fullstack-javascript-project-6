import fastify from 'fastify';
import view from '@fastify/view';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import formBody from '@fastify/formbody';
import pug from 'pug';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { fileURLToPath } from 'url';
import configureAuth from './lib/auth.js';
import routes from './routes.js';
import knexInstance from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = fastify({
  logger: true,
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

// Функция перевода
const t = (key) => i18next.t(key);

// Регистрация плагинов (ВАЖНО: formBody должен быть зарегистрирован до обработки данных)
app.register(formBody); // ← Добавьте эту строку

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
  // Очищаем flash после использования
  const flash = { ...request.session.flash };
  request.session.flash = {};
  reply.locals.flash = flash;
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