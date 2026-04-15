import Task from '../models/Task.js';
import User from '../models/User.js';
import TaskStatus from '../models/TaskStatus.js';
import Label from '../models/Label.js';

// Список всех задач
export const listTasks = async (request, reply) => {
  try {
    const { status, assigned_to_id, label, isCreatorUser } = request.query;
    const userId = request.user?.id;
    
    console.log('Query params:', { status, assigned_to_id, label, isCreatorUser });
    
    // Базовый запрос с eager loading для связанных данных
    let query = Task.query()
      .withGraphFetched('[creator, executor, status, labels]') // Добавили labels
      .orderBy('id');
    
    // Применяем фильтры
    if (status && status !== '') {
      query = query.where('statusId', parseInt(status, 10));
    }
    
    if (assigned_to_id && assigned_to_id !== '') {
      query = query.where('executorId', parseInt(assigned_to_id, 10));
    }
    
    if (isCreatorUser === 'on' && userId) {
      query = query.where('creatorId', userId);
    }
    
    let tasks;
    
    // Фильтр по метке - ИСПРАВЛЕНАЯ ВЕРСИЯ
    if (label && label !== '') {
      try {
        // Используем JOIN для фильтрации по меткам
        tasks = await query
          .join('task_labels', 'tasks.id', 'task_labels.taskId')
          .where('task_labels.labelId', parseInt(label, 10))
          .select('tasks.*');
        
        console.log(`Найдено задач с меткой ${label}:`, tasks.length);
      } catch (error) {
        console.error('Ошибка фильтрации по метке:', error.message);
        // В случае ошибки показываем все задачи без фильтра по метке
        tasks = await query;
      }
    } else {
      tasks = await query;
    }
    
    // Получаем данные для фильтров
    const statuses = await TaskStatus.query().orderBy('id');
    const users = await User.query().select('id', 'firstName', 'lastName').orderBy('id');
    const labels = await Label.query().orderBy('id');
    
    console.log(`Всего найдено задач: ${tasks.length}`);
    console.log('Задачи:', tasks.map(t => ({ id: t.id, name: t.name })));
    
    return reply.view('tasks/index', {
      tasks,
      statuses,
      users,
      labels,
      filters: {
        status: status || '',
        assigned_to_id: assigned_to_id || '',
        label: label || '',
        isCreatorUser: isCreatorUser || ''
      },
      title: 'Задачи',
      user: request.user
    });
  } catch (error) {
    console.error('Ошибка при загрузке задач:', error);
    console.error('Стек ошибки:', error.stack);
    reply.flash('error', 'Ошибка при загрузке задач');
    return reply.redirect('/');
  }
};

export const showTask = async (request, reply) => {
  const { id } = request.params;
  try {
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
      user: request.user
    });
  } catch (error) {
    console.error('Ошибка при загрузке задачи:', error);
    reply.flash('error', 'Ошибка при загрузке задачи');
    return reply.redirect('/tasks');
  }
};

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
    user: request.user
  });
};

export const createTask = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  try {
    const taskData = request.body.data;
    taskData.creatorId = request.user.id;
    
    taskData.statusId = parseInt(taskData.statusId, 10);
    if (taskData.executorId) {
      taskData.executorId = parseInt(taskData.executorId, 10);
    } else {
      taskData.executorId = null;
    }
    
    const task = await Task.query().insert(taskData);
    
    reply.flash('success', 'Задача успешно создана');
    return reply.redirect('/tasks');
  } catch (error) {
    console.error('Ошибка при создании задачи:', error);
    
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
      user: request.user
    });
  }
};

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
    user: request.user
  });
};

export const updateTask = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const { id } = request.params;
  
  const existingTask = await Task.query().findById(id);
  if (!existingTask) {
    reply.flash('error', 'Задача не найдена');
    return reply.redirect('/tasks');
  }
  
  if (existingTask.creatorId !== request.user.id) {
    reply.flash('error', 'Вы можете редактировать только свои задачи');
    return reply.redirect('/tasks');
  }
  
  try {
    const taskData = request.body.data;
    
    if (taskData.statusId) {
      taskData.statusId = parseInt(taskData.statusId, 10);
    }
    if (taskData.executorId) {
      taskData.executorId = parseInt(taskData.executorId, 10);
    } else {
      taskData.executorId = null;
    }
    
    await Task.query().patchAndFetchById(id, taskData);
    
    reply.flash('success', 'Задача успешно обновлена');
    return reply.redirect('/tasks');
  } catch (error) {
    console.error('Ошибка при обновлении задачи:', error);
    
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
      user: request.user
    });
  }
};

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
  
  if (task.creatorId !== request.user.id) {
    reply.flash('error', 'Только создатель может удалить задачу');
    return reply.redirect('/tasks');
  }
  
  try {
    await Task.query().deleteById(id);
    reply.flash('success', 'Задача успешно удалена');
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    reply.flash('error', 'Ошибка при удалении задачи');
  }
  
  return reply.redirect('/tasks');
};
