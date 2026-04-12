import User from '../models/User.js';
import rollbar from '../lib/rollbar.js';

// Список всех пользователей
export const listUsers = async (request, reply) => {
  try {
    const users = await User.query().select('id', 'firstName', 'lastName', 'email').orderBy('id');
    return reply.view('users/index', {
      users,
      title: 'Пользователи',
    });
  } catch (error) {
    rollbar.error('Error listing users', error, {
      userId: request.user?.id,
      url: request.url,
    });
    reply.flash('error', 'Ошибка при загрузке списка пользователей');
    return reply.redirect('/');
  }
};

// Форма регистрации
export const newUserForm = async (request, reply) => {
  try {
    return reply.view('users/new', {
      user: {},
      title: 'Регистрация',
    });
  } catch (error) {
    rollbar.error('Error loading registration form', error);
    reply.flash('error', 'Ошибка при загрузке формы регистрации');
    return reply.redirect('/');
  }
};

// Создание пользователя (регистрация)
export const createUser = async (request, reply) => {
  try {
    const userData = request.body.data;
    
    // Проверка, существует ли пользователь с таким email
    const existingUser = await User.query().findOne({ email: userData.email });
    if (existingUser) {
      rollbar.info('Registration attempt with existing email', {
        email: userData.email,
        ip: request.ip,
      });
      reply.flash('error', 'Пользователь с таким email уже существует');
      return reply.view('users/new', {
        user: userData,
        title: 'Регистрация',
      });
    }
    
    await User.query().insert(userData);
    
    rollbar.info('New user registered', {
      userId: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
    });
    
    reply.flash('success', 'Пользователь успешно зарегистрирован');
    return reply.redirect('/users');
  } catch (error) {
    rollbar.error('User registration failed', error, {
      email: request.body.data?.email,
      firstName: request.body.data?.firstName,
      lastName: request.body.data?.lastName,
      timestamp: new Date().toISOString(),
    });
    
    reply.flash('error', 'Ошибка при регистрации: ' + (error.message || 'Неизвестная ошибка'));
    return reply.view('users/new', {
      user: request.body.data || {},
      errors: error.data,
      title: 'Регистрация',
    });
  }
};

// Форма редактирования пользователя
export const editUserForm = async (request, reply) => {
  try {
    const { id } = request.params;
    const user = await User.query().findById(id);
    
    if (!user) {
      rollbar.warning('User not found for editing', {
        userId: id,
        requestedBy: request.user?.id,
      });
      reply.flash('error', 'Пользователь не найден');
      return reply.redirect('/users');
    }
    
    // Проверка, что пользователь редактирует себя
    if (request.user.id !== parseInt(id)) {
      rollbar.warning('Unauthorized edit attempt', {
        targetUserId: id,
        attemptedBy: request.user?.id,
      });
      reply.flash('error', 'Вы можете редактировать только свой профиль');
      return reply.redirect('/users');
    }
    
    return reply.view('users/edit', {
      user,
      title: 'Редактирование пользователя',
    });
  } catch (error) {
    rollbar.error('Error loading edit user form', error, {
      userId: request.params.id,
      currentUser: request.user?.id,
    });
    reply.flash('error', 'Ошибка при загрузке формы редактирования');
    return reply.redirect('/users');
  }
};

// Обновление пользователя
export const updateUser = async (request, reply) => {
  try {
    const { id } = request.params;
    
    // Проверка, что пользователь редактирует себя
    if (request.user.id !== parseInt(id)) {
      rollbar.warning('Unauthorized update attempt', {
        targetUserId: id,
        attemptedBy: request.user?.id,
      });
      reply.flash('error', 'Вы можете редактировать только свой профиль');
      return reply.redirect('/users');
    }
    
    const userData = request.body.data;
    
    // Если пароль пустой, удаляем его из обновления
    if (!userData.password) {
      delete userData.password;
    }
    
    // Проверка уникальности email (если email изменен)
    if (userData.email) {
      const existingUser = await User.query()
        .findOne({ email: userData.email })
        .whereNot('id', id);
      
      if (existingUser) {
        reply.flash('error', 'Пользователь с таким email уже существует');
        const user = await User.query().findById(id);
        return reply.view('users/edit', {
          user: { ...user, ...userData },
          title: 'Редактирование пользователя',
        });
      }
    }
    
    const updatedUser = await User.query().patchAndFetchById(id, userData);
    
    rollbar.info('User updated successfully', {
      userId: id,
      email: updatedUser.email,
      updatedFields: Object.keys(userData),
    });
    
    reply.flash('success', 'Пользователь успешно обновлен');
    return reply.redirect('/users');
  } catch (error) {
    rollbar.error('User update failed', error, {
      userId: request.params.id,
      updateData: request.body.data,
      currentUser: request.user?.id,
    });
    
    const user = await User.query().findById(request.params.id);
    reply.flash('error', 'Ошибка при обновлении: ' + (error.message || 'Неизвестная ошибка'));
    return reply.view('users/edit', {
      user: { ...user, ...request.body.data },
      errors: error.data,
      title: 'Редактирование пользователя',
    });
  }
};

// Удаление пользователя
export const deleteUser = async (request, reply) => {
  try {
    const { id } = request.params;
    
    // Проверка, что пользователь удаляет себя
    if (request.user.id !== parseInt(id)) {
      rollbar.warning('Unauthorized delete attempt', {
        targetUserId: id,
        attemptedBy: request.user?.id,
      });
      reply.flash('error', 'Вы можете удалить только свой профиль');
      return reply.redirect('/users');
    }
    
    // Проверка, есть ли у пользователя созданные задачи
    const userWithTasks = await User.query()
      .findById(id)
      .withGraphFetched('[createdTasks, executedTasks]');
    
    if (userWithTasks.createdTasks && userWithTasks.createdTasks.length > 0) {
      rollbar.info('Cannot delete user with created tasks', {
        userId: id,
        tasksCount: userWithTasks.createdTasks.length,
      });
      reply.flash('error', `Невозможно удалить пользователя, так как он является автором ${userWithTasks.createdTasks.length} задач`);
      return reply.redirect('/users');
    }
    
    if (userWithTasks.executedTasks && userWithTasks.executedTasks.length > 0) {
      rollbar.info('Cannot delete user with assigned tasks', {
        userId: id,
        tasksCount: userWithTasks.executedTasks.length,
      });
      reply.flash('error', `Невозможно удалить пользователя, так как он является исполнителем ${userWithTasks.executedTasks.length} задач`);
      return reply.redirect('/users');
    }
    
    const userEmail = request.user.email;
    await User.query().deleteById(id);
    
    rollbar.info('User deleted successfully', {
      userId: id,
      email: userEmail,
    });
    
    request.session.destroy();
    reply.flash('success', 'Пользователь успешно удален');
    return reply.redirect('/');
  } catch (error) {
    rollbar.error('User deletion failed', error, {
      userId: request.params.id,
      currentUser: request.user?.id,
    });
    reply.flash('error', 'Ошибка при удалении пользователя: ' + (error.message || 'Неизвестная ошибка'));
    return reply.redirect('/users');
  }
};