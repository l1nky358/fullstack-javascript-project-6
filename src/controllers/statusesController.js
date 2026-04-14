import TaskStatus from '../models/TaskStatus.js';

// Список всех статусов
export const listStatuses = async (request, reply) => {
  const statuses = await TaskStatus.query().orderBy('id');
  return reply.view('statuses/index', {
    statuses,
    title: 'Статусы задач',
  });
};

// Форма создания статуса
export const newStatusForm = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }
  
  // Очищаем старые flash сообщения при загрузке формы
  if (request.session) {
    request.session.flash = {};
  }
  
  return reply.view('statuses/new', {
    status: {},
    errors: null,
    title: 'Создание статуса',
  });
};

// Создание статуса
export const createStatus = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const statusData = request.body.data;
  const errors = {};
  
  // Валидация
  if (!statusData.name || statusData.name.trim() === '') {
    errors.name = 'Наименование не должно быть пустым';
  }
  
  if (Object.keys(errors).length > 0) {
    reply.flash('error', 'Не удалось создать статус');
    return reply.view('statuses/new', {
      status: statusData,
      errors: errors,
      title: 'Создание статуса',
    });
  }
  
  try {
    await TaskStatus.query().insert(statusData);
    reply.flash('success', 'Статус успешно создан');
    return reply.redirect('/statuses');
  } catch (error) {
    reply.flash('error', 'Не удалось создать статус');
    return reply.view('statuses/new', {
      status: statusData,
      errors: { name: 'Ошибка при создании статуса' },
      title: 'Создание статуса',
    });
  }
};

// Форма редактирования статуса
export const editStatusForm = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }
  
  const { id } = request.params;
  const status = await TaskStatus.query().findById(id);
  
  if (!status) {
    reply.flash('error', 'Статус не найден');
    return reply.redirect('/statuses');
  }
  
  return reply.view('statuses/edit', {
    status,
    title: 'Редактирование статуса',
  });
};

// Обновление статуса
export const updateStatus = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const { id } = request.params;
  
  try {
    const statusData = request.body.data;
    await TaskStatus.query().patchAndFetchById(id, statusData);
    reply.flash('success', 'Статус успешно изменён');
    return reply.redirect('/statuses');
  } catch (error) {
    const status = await TaskStatus.query().findById(id);
    reply.flash('error', 'Ошибка при обновлении статуса');
    return reply.view('statuses/edit', {
      status: { ...status, ...request.body.data },
      errors: error.data,
      title: 'Редактирование статуса',
    });
  }
};

// Удаление статуса
export const deleteStatus = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const { id } = request.params;
  
  try {
    await TaskStatus.query().deleteById(id);
    reply.flash('success', 'Статус успешно удалён');
  } catch (error) {
    reply.flash('error', 'Ошибка при удалении статуса');
  }
  
  return reply.redirect('/statuses');
};
