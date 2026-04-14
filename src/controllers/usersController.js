import User from '../models/User.js';
import rollbar from '../lib/rollbar.js';

// Список всех пользователей
export const listUsers = async (request, reply) => {
  try {
    const users = await User.query().select('id', 'firstName', 'lastName', 'email', 'createdAt').orderBy('id');
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
      title: 'Регистрация',
      errors: null,
      formData: {},
    });
  } catch (error) {
    rollbar.error('Error loading registration form', error);
    reply.flash('error', 'Ошибка при загрузке формы регистрации');
    return reply.redirect('/');
  }
};

// Создание пользователя (регистрация)
export const createUser = async (request, reply) => {
  const userData = request.body.data || {};
  const errors = {};
  
  // Валидация
  if (!userData.firstName || userData.firstName.trim() === '') {
    errors.firstName = 'Имя не должно быть пустым';
  }
  
  if (!userData.lastName || userData.lastName.trim() === '') {
    errors.lastName = 'Фамилия не должна быть пустой';
  }
  
  if (!userData.email || userData.email.trim() === '') {
    errors.email = 'Email не должен быть пустым';
  }
  
  if (!userData.password || userData.password.trim() === '') {
    errors.password = 'Пароль не должен быть пустым';
  } else if (userData.password.length < 3) {
    errors.password = 'Пароль должен содержать минимум 3 символа';
  }
  
  // Проверка уникальности email
  if (userData.email && !errors.email) {
    const existingUser = await User.query().findOne({ email: userData.email });
    if (existingUser) {
      errors.email = 'Пользователь с таким email уже существует';
    }
  }
  
  // Если есть ошибки - показываем форму с ошибками
  if (Object.keys(errors).length > 0) {
    reply.flash('error', 'Не удалось зарегистрировать');
    return reply.view('users/new', {
      title: 'Регистрация',
      errors: errors,
      formData: userData,
    });
  }
  
  try {
    await User.query().insert(userData);
    reply.flash('success', 'Пользователь успешно зарегистрирован');
    return reply.redirect('/');
  } catch (error) {
    rollbar.error('User registration failed', error, {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
    });
    
    reply.flash('error', 'Не удалось зарегистрировать');
    errors.general = 'Ошибка при регистрации';
    return reply.view('users/new', {
      title: 'Регистрация',
      errors: errors,
      formData: userData,
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
    
    reply.flash('success', 'Пользователь успешно изменён');
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
    
    // Проверка, что пользователь существует
    const userToDelete = await User.query().findById(id);
    if (!userToDelete) {
      return reply.redirect('/users');
    }
    
    // Проверка, что пользователь удаляет себя
    if (!request.user || request.user.id !== parseInt(id)) {
      rollbar.warning('Unauthorized delete attempt', {
        targetUserId: id,
        attemptedBy: request.user?.id,
      });
      return reply.redirect('/users');
    }
    
    // Удаляем пользователя
    await User.query().deleteById(id);
    
    rollbar.info('User deleted successfully', {
      userId: id,
      email: userToDelete.email,
    });
    
    reply.flash('success', 'Пользователь успешно удалён');
    return reply.redirect('/users');
  } catch (error) {
    rollbar.error('User deletion failed', error, {
      userId: request.params.id,
      currentUser: request.user?.id,
    });
    return reply.redirect('/users');
  }
};
