import User from '../models/User.js';

// Список всех пользователей
export const listUsers = async (request, reply) => {
  const users = await User.query().select('id', 'firstName', 'lastName', 'email').orderBy('id');
  return reply.view('users/index', {
    users,
    title: 'Пользователи',
  });
};

// Форма регистрации
export const newUserForm = async (request, reply) => {
  return reply.view('users/new', {
    user: {},
    title: 'Регистрация',
  });
};

// Создание пользователя (регистрация)
export const createUser = async (request, reply) => {
  try {
    const userData = request.body.data;
    await User.query().insert(userData);
    reply.flash('success', 'Пользователь успешно зарегистрирован');
    return reply.redirect('/users');
  } catch (error) {
    reply.flash('error', 'Ошибка при регистрации');
    return reply.view('users/new', {
      user: request.body.data,
      errors: error.data,
      title: 'Регистрация',
    });
  }
};

// Форма редактирования пользователя
export const editUserForm = async (request, reply) => {
  const { id } = request.params;
  const user = await User.query().findById(id);
  
  if (!user) {
    reply.flash('error', 'Пользователь не найден');
    return reply.redirect('/users');
  }
  
  // Проверка, что пользователь редактирует себя
  if (request.user.id !== parseInt(id)) {
    reply.flash('error', 'Вы можете редактировать только свой профиль');
    return reply.redirect('/users');
  }
  
  return reply.view('users/edit', {
    user,
    title: 'Редактирование пользователя',
  });
};

// Обновление пользователя
export const updateUser = async (request, reply) => {
  const { id } = request.params;
  
  // Проверка, что пользователь редактирует себя
  if (request.user.id !== parseInt(id)) {
    reply.flash('error', 'Вы можете редактировать только свой профиль');
    return reply.redirect('/users');
  }
  
  try {
    const userData = request.body.data;
    
    // Если пароль пустой, удаляем его из обновления
    if (!userData.password) {
      delete userData.password;
    }
    
    await User.query().patchAndFetchById(id, userData);
    reply.flash('success', 'Пользователь успешно обновлен');
    return reply.redirect('/users');
  } catch (error) {
    const user = await User.query().findById(id);
    reply.flash('error', 'Ошибка при обновлении');
    return reply.view('users/edit', {
      user: { ...user, ...request.body.data },
      errors: error.data,
      title: 'Редактирование пользователя',
    });
  }
};

// Удаление пользователя
export const deleteUser = async (request, reply) => {
  const { id } = request.params;
  
  // Проверка, что пользователь удаляет себя
  if (request.user.id !== parseInt(id)) {
    reply.flash('error', 'Вы можете удалить только свой профиль');
    return reply.redirect('/users');
  }
  
  // Проверка, есть ли у пользователя созданные задачи
  const userWithTasks = await User.query()
    .findById(id)
    .withGraphFetched('[createdTasks, executedTasks]');
  
  if (userWithTasks.createdTasks && userWithTasks.createdTasks.length > 0) {
    reply.flash('error', 'Невозможно удалить пользователя, так как он является автором задач');
    return reply.redirect('/users');
  }
  
  if (userWithTasks.executedTasks && userWithTasks.executedTasks.length > 0) {
    reply.flash('error', 'Невозможно удалить пользователя, так как он является исполнителем задач');
    return reply.redirect('/users');
  }
  
  try {
    await User.query().deleteById(id);
    request.session.destroy();
    reply.flash('success', 'Пользователь успешно удален');
    return reply.redirect('/');
  } catch (error) {
    reply.flash('error', 'Ошибка при удалении пользователя');
    return reply.redirect('/users');
  }
};