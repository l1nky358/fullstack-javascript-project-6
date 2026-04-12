import Task from '../models/Task.js';
import User from '../models/User.js';
import TaskStatus from '../models/TaskStatus.js';
import Label from '../models/Label.js';

// Список всех задач с фильтрацией
export const listTasks = async (request, reply) => {
  try {
    const { statusId, executorId, labelId, isCreatorUser } = request.query;
    
    // Получаем данные для фильтров
    const users = await User.query().select('id', 'firstName', 'lastName').orderBy('id');
    const statuses = await TaskStatus.query().orderBy('id');
    const labels = await Label.query().orderBy('id');
    
    // Строим запрос
    let query = Task.query()
      .withGraphFetched('[creator, executor, status, labels]')
      .orderBy('id');
    
    // Фильтр по статусу
    if (statusId && statusId !== '') {
      query = query.where('statusId', statusId);
    }
    
    // Фильтр по исполнителю
    if (executorId && executorId !== '') {
      query = query.where('executorId', executorId);
    }
    
    // Фильтр по автору (текущий пользователь)
    if (isCreatorUser === 'on' && request.user) {
      query = query.where('creatorId', request.user.id);
    }
    
    // Фильтр по метке
    if (labelId && labelId !== '') {
      query = query.joinRelated('labels').where('labels.id', labelId);
    }
    
    const tasks = await query;
    
    // Сохраняем параметры фильтра для отображения в форме
    const filters = {
      statusId: statusId || '',
      executorId: executorId || '',
      labelId: labelId || '',
      isCreatorUser: isCreatorUser === 'on',
    };
    
    return reply.view('tasks/index', {
      tasks,
      users,
      statuses,
      labels,
      filters,
      title: 'Задачи',
    });
  } catch (error) {
    console.error('Filter error:', error);
    reply.flash('error', 'Ошибка при фильтрации задач');
    return reply.redirect('/tasks');
  }
};

// Страница просмотра задачи
export const showTask = async (request, reply) => {
  const { id } = request.params;
  const task = await Task.query()
    .withGraphFetched('[creator, executor, status, labels]')
    .findById(id);
  
  if (!task) {
    reply.flash('error', 'Задача не найдена');
    return reply.redirect('/tasks');
  }
  
  return reply.view('tasks/show', {
    task,
    title: task.name,
  });
};

// Форма создания задачи
export const newTaskForm = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }
  
  const users = await User.query().select('id', 'firstName', 'lastName').orderBy('id');
  const statuses = await TaskStatus.query().orderBy('id');
  const labels = await Label.query().orderBy('id');
  
  return reply.view('tasks/new', {
    task: {},
    users,
    statuses,
    labels,
    title: 'Создание задачи',
  });
};

// Создание задачи
export const createTask = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  try {
    const taskData = request.body.data;
    taskData.creatorId = request.user.id;
    
    // Получаем выбранные метки
    const labelIds = request.body.data.labels || [];
    
    const task = await Task.query().insert(taskData);
    
    // Добавляем связи с метками
    if (labelIds.length > 0) {
      await task.$relatedQuery('labels').relate(labelIds);
    }
    
    reply.flash('success', 'Задача успешно создана');
    return reply.redirect('/tasks');
  } catch (error) {
    const users = await User.query().select('id', 'firstName', 'lastName').orderBy('id');
    const statuses = await TaskStatus.query().orderBy('id');
    const labels = await Label.query().orderBy('id');
    
    reply.flash('error', 'Ошибка при создании задачи');
    return reply.view('tasks/new', {
      task: request.body.data,
      users,
      statuses,
      labels,
      errors: error.data,
      title: 'Создание задачи',
    });
  }
};

// Форма редактирования задачи
export const editTaskForm = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }
  
  const { id } = request.params;
  const task = await Task.query()
    .withGraphFetched('labels')
    .findById(id);
  
  if (!task) {
    reply.flash('error', 'Задача не найдена');
    return reply.redirect('/tasks');
  }
  
  // Проверка прав: только создатель может редактировать
  if (task.creatorId !== request.user.id) {
    reply.flash('error', 'Вы можете редактировать только свои задачи');
    return reply.redirect('/tasks');
  }
  
  const users = await User.query().select('id', 'firstName', 'lastName').orderBy('id');
  const statuses = await TaskStatus.query().orderBy('id');
  const labels = await Label.query().orderBy('id');
  
  return reply.view('tasks/edit', {
    task,
    users,
    statuses,
    labels,
    title: 'Редактирование задачи',
  });
};

// Обновление задачи
export const updateTask = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const { id } = request.params;
  
  // Проверка прав
  const existingTask = await Task.query().findById(id);
  if (existingTask.creatorId !== request.user.id) {
    reply.flash('error', 'Вы можете редактировать только свои задачи');
    return reply.redirect('/tasks');
  }
  
  try {
    const taskData = request.body.data;
    const labelIds = request.body.data.labels || [];
    
    const task = await Task.query().patchAndFetchById(id, taskData);
    
    // Обновляем связи с метками
    await task.$relatedQuery('labels').unrelate();
    if (labelIds.length > 0) {
      await task.$relatedQuery('labels').relate(labelIds);
    }
    
    reply.flash('success', 'Задача успешно обновлена');
    return reply.redirect('/tasks');
  } catch (error) {
    const task = await Task.query().findById(id);
    const users = await User.query().select('id', 'firstName', 'lastName').orderBy('id');
    const statuses = await TaskStatus.query().orderBy('id');
    const labels = await Label.query().orderBy('id');
    
    reply.flash('error', 'Ошибка при обновлении задачи');
    return reply.view('tasks/edit', {
      task: { ...task, ...request.body.data },
      users,
      statuses,
      labels,
      errors: error.data,
      title: 'Редактирование задачи',
    });
  }
};

// Удаление задачи
export const deleteTask = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const { id } = request.params;
  const task = await Task.query().findById(id);
  
  if (!task) {
    reply.flash('error', 'Задача не найдена');
    return reply.redirect('/tasks');
  }
  
  // Проверка, что пользователь - создатель задачи
  if (task.creatorId !== request.user.id) {
    reply.flash('error', 'Только создатель может удалить задачу');
    return reply.redirect('/tasks');
  }
  
  try {
    await Task.query().deleteById(id);
    reply.flash('success', 'Задача успешно удалена');
  } catch (error) {
    reply.flash('error', 'Ошибка при удалении задачи');
  }
  
  return reply.redirect('/tasks');
};