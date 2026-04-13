import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export default async function configureAuth(app) {
  // Страница входа
  app.get('/session/new', async (request, reply) => {
    return reply.view('sessions/new', {
      title: 'Вход',
      errors: null,
    });
  });

  // Вход с валидацией
  app.post('/session', async (request, reply) => {
    const { email, password } = request.body.data;
    
    // Валидация
    const errors = [];
    if (!email || email.trim() === '') {
      errors.push({ field: 'email', message: 'Email не может быть пустым' });
    }
    if (!password || password.trim() === '') {
      errors.push({ field: 'password', message: 'Пароль не может быть пустым' });
    }
    
    if (errors.length > 0) {
      return reply.view('sessions/new', {
        title: 'Вход',
        errors: errors,
        formData: { email, password },
      });
    }
    
    const user = await User.query().findOne({ email });
    if (!user) {
      return reply.view('sessions/new', {
        title: 'Вход',
        errors: [{ field: 'email', message: 'Неверный email или пароль' }],
        formData: { email, password: '' },
      });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return reply.view('sessions/new', {
        title: 'Вход',
        errors: [{ field: 'password', message: 'Неверный email или пароль' }],
        formData: { email, password: '' },
      });
    }
    
    request.session.userId = user.id;
    reply.flash('success', 'Вы залогинены');
    return reply.redirect('/');
  });

  // Выход
  app.post('/session/delete', async (request, reply) => {
    request.session.userId = null;
    reply.flash('success', 'Вы разлогинены');
    return reply.redirect('/');
  });
}
