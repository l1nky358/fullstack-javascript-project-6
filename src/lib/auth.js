import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export default async function configureAuth(app) {
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
    reply.flash('success', 'Вы залогинены');
    return reply.redirect('/');
  });

  // Выход - ВАЖНО: редирект на '/'
  app.post('/session/delete', async (request, reply) => {
    request.session.destroy();
    reply.flash('success', 'Вы успешно вышли');
    return reply.redirect('/');
  });
}
