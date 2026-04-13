import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export default async function configureAuth(app) {
  // Страница входа
  app.get('/session/new', async (request, reply) => {
    return reply.view('sessions/new', {
      title: 'Вход',
      errors: null,
      formData: {},
    });
  });

  // Вход
  app.post('/session', async (request, reply) => {
    const { email, password } = request.body.data;
    const errors = {};
    
    // Валидация - показываем только одну ошибку
    if (!email || email.trim() === '') {
      errors.email = 'Email не должен быть пустым';
    } else if (!password || password.trim() === '') {
      errors.password = 'Пароль не должен быть пустым';
    }
    
    // Если есть ошибки валидации
    if (Object.keys(errors).length > 0) {
      return reply.view('sessions/new', {
        title: 'Вход',
        errors: errors,
        formData: { email, password: '' },
      });
    }
    
    const user = await User.query().findOne({ email });
    if (!user) {
      errors.email = 'Неправильный имейл или пароль';
      return reply.view('sessions/new', {
        title: 'Вход',
        errors: errors,
        formData: { email, password: '' },
      });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      errors.email = 'Неправильный имейл или пароль';
      return reply.view('sessions/new', {
        title: 'Вход',
        errors: errors,
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
