import User from '../models/User.js';

export const listUsers = async (request, reply) => {
  const users = await User.query().select('id', 'firstName', 'lastName', 'email');
  return reply.view('users/index', {
    users,
    title: 'Пользователи',
    t: (key) => request.t(key),
  });
};

export const newUserForm = async (request, reply) => {
  return reply.view('users/new', {
    user: {},
    title: 'Регистрация',
    t: (key) => request.t(key),
  });
};

export const createUser = async (request, reply) => {
  try {
    const userData = request.body.data;
    await User.query().insert(userData);
    request.flash('success', 'Пользователь успешно зарегистрирован');
    return reply.redirect('/users');
  } catch (error) {
    request.flash('error', 'Ошибка при регистрации');
    return reply.view('users/new', {
      user: request.body.data,
      errors: error.data,
      t: (key) => request.t(key),
    });
  }
};

export const editUserForm = async (request, reply) => {
  const { id } = request.params;
  const user = await User.query().findById(id);
  
  if (!user) {
    request.flash('error', 'Пользователь не найден');
    return reply.redirect('/users');
  }
  
  return reply.view('users/edit', {
    user,
    title: 'Редактирование пользователя',
    t: (key) => request.t(key),
  });
};

export const updateUser = async (request, reply) => {
  const { id } = request.params;
  
  if (request.user.id !== parseInt(id)) {
    request.flash('error', 'Вы можете редактировать только свой профиль');
    return reply.redirect('/users');
  }
  
  try {
    const userData = request.body.data;
    await User.query().patchAndFetchById(id, userData);
    request.flash('success', 'Пользователь успешно обновлен');
    return reply.redirect('/users');
  } catch (error) {
    const user = await User.query().findById(id);
    request.flash('error', 'Ошибка при обновлении');
    return reply.view('users/edit', {
      user: { ...user, ...request.body.data },
      errors: error.data,
      t: (key) => request.t(key),
    });
  }
};

export const deleteUser = async (request, reply) => {
  const { id } = request.params;
  
  if (request.user.id !== parseInt(id)) {
    request.flash('error', 'Вы можете удалить только свой профиль');
    return reply.redirect('/users');
  }
  
  await User.query().deleteById(id);
  request.logout();
  request.flash('success', 'Пользователь успешно удален');
  return reply.redirect('/');
};