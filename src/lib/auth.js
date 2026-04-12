import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export default async function configureAuth(app) {
  // Middleware для метода DELETE (для форм)
  app.addHook('preHandler', (request, reply, done) => {
    if (request.body && request.body._method) {
      request.method = request.body._method;
    }
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

  // Страница входа
  app.get('/session/new', async (request, reply) => {
    return reply.view('sessions/new', {
      title: 'Вход',
    });
  });

  // Вход
  app.post('/session', async (request, reply) => {
    const { email, password } = request.body.data;
    
    const user = await User.query().findOne({ email });
    if (!user) {
      reply.flash('error', 'Неверный email или пароль');
      return reply.redirect('/session/new');
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      reply.flash('error', 'Неверный email или пароль');
      return reply.redirect('/session/new');
    }
    
    request.session.userId = user.id;
    reply.flash('success', 'Добро пожаловать!');
    return reply.redirect('/');
  });

  // Выход
  app.post('/session/delete', async (request, reply) => {
    request.session.destroy();
    reply.flash('success', 'Вы успешно вышли');
    return reply.redirect('/');
  });
  
  // Поддержка DELETE через _method
  app.delete('/session', async (request, reply) => {
    request.session.destroy();
    reply.flash('success', 'Вы успешно вышли');
    return reply.redirect('/');
  });
}