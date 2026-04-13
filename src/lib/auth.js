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

  // Выход - без query параметра
  app.post('/session/delete', async (request, reply) => {
    // Очищаем userId из сессии
    request.session.userId = null;
    // Устанавливаем flash сообщение
    reply.flash('success', 'Вы разлогинены');
    // Редирект на главную без параметров
    return reply.redirect('/');
  });
}
