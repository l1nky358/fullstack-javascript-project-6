import passport from '@fastify/passport';

export const newSession = async (request, reply) => {
  return reply.view('sessions/new', {
    title: 'Вход',
    t: (key) => request.t(key),
  });
};

export const createSession = async (request, reply) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      reply.flash('error', 'Ошибка аутентификации');
      return reply.redirect('/session/new');
    }
    
    if (!user) {
      reply.flash('error', info?.message || 'Неверный email или пароль');
      return reply.redirect('/session/new');
    }
    
    request.login(user);
    reply.flash('success', 'Добро пожаловать!');
    return reply.redirect('/');
  })(request, reply);
};

export const deleteSession = async (request, reply) => {
  request.logout();
  reply.flash('success', 'Вы успешно вышли');
  return reply.redirect('/');
};