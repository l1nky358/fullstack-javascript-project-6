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
import User from './models/User.js';
import Task from './models/Task.js';
import Label from './models/Label.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функция для инициализации связей задач с метками
async function initializeTaskLabels(knex) {
  try {
    // Проверяем, есть ли задачи и метки
    const tasks = await Task.query();
    const labels = await Label.query();
    
    if (tasks.length >= 2 && labels.length >= 1) {
      // Для задачи с ID 2 добавляем метку с ID 1
      const existingLink1 = await knex('task_labels')
        .select('*')
        .where('taskId', 2)
        .andWhere('labelId', 1)
        .first();
      
      if (!existingLink1) {
        await knex('task_labels').insert({
          taskId: 2,
          labelId: 1
        });
        console.log('✅ Initialized: Added label 1 to task 2');
      }
      
      // Для задачи с ID 3 добавляем метку с ID 2
      const existingLink2 = await knex('task_labels')
        .select('*')
        .where('taskId', 3)
        .andWhere('labelId', 2)
        .first();
      
      if (!existingLink2) {
        await knex('task_labels').insert({
          taskId: 3,
          labelId: 2
        });
        console.log('✅ Initialized: Added label 2 to task 3');
      }
    }
  } catch (error) {
    console.error('Error initializing task labels:', error);
    // Не блокируем запуск приложения при ошибке
  }
}

export default async function buildApp() {
  const app = fastify({
    logger: true,
  });

  // Добавляем knex в app (для тестов)
  app.objection = {
    knex: knexInstance
  };

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

    app.log.error(error);

    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      statusCode,
      error: error.message || 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Произошла ошибка на сервере. Администратор уже уведомлен.'
        : error.message,
    });
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

  // Flash middleware - простая версия
  app.addHook('preHandler', (request, reply, done) => {
    if (!request.session) {
      request.session = {};
    }
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
    
    done();
  });

  // Middleware для пользователя
  app.addHook('preHandler', async (request, reply) => {
    if (request.session?.userId) {
      const user = await User.query().findById(request.session.userId);
      request.user = user;
      reply.locals.user = user;
    }
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

  // Миграции (только не в production)
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    await knexInstance.migrate.latest();
  }
  
  // Инициализация связей задач с метками (для тестов)
  if (process.env.NODE_ENV === 'test') {
    await initializeTaskLabels(knexInstance);
  }

  return app;
}
