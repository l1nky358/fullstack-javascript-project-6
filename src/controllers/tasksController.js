import Task from '../models/Task.js';
import User from '../models/User.js';
import TaskStatus from '../models/TaskStatus.js';
import Label from '../models/Label.js';

// Список всех задач
export const listTasks = async (request, reply) => {
  try {
    const { status, executor, label, isCreatorUser } = request.query;
    const userId = request.user?.id;
    
    let query = Task.query()
      .withGraphFetched('[creator, executor, status, labels]')
      .orderBy('id');
    
    if (status) {
      query = query.where('statusId', parseInt(status, 10));
    }
    
    if (executor) {
      query = query.where('executorId', parseInt(executor, 10));
    }
    
    if (isCreatorUser === 'on' && userId) {
      query = query.where('creatorId', userId);
    }
    
    if (label) {
      const labelId = parseInt(label, 10);
      const taskIds = await Task.knex()
        .select('taskId')
        .from('task_labels')
        .where('labelId', labelId)
        .pluck('taskId');
      
      if (taskIds.length > 0) {
        query = query.whereIn('id', taskIds);
      } else {
        query = query.where('id', -1);
      }
    }
    
    const tasks = await query;
    
    const statuses = await TaskStatus.query().orderBy('id');
    const users = await User.query().select('id', 'firstName', 'lastName').orderBy('id');
    const labels = await Label.query().orderBy('id');
    
    return reply.view('tasks/index', {
      tasks,
      statuses,
      users,
      labels,
      filters: request.query,
      title: 'Задачи',
      user: request.user
    });
  } catch (error) {
    console.error('List tasks error:', error);
    reply.flash('error', 'Ошибка при загрузке задач');
    return reply.redirect('/');
  }
};

// Страница просмотра задачи
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
    console.error('Show task error:', error);
    reply.flash('error', 'Ошибка при загрузке задачи');
    return reply.redirect('/tasks');
  }
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
    user: request.user
  });
};

// Создание задачи - ИСПРАВЛЕНО
export const createTask = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  try {
    const taskData = request.body.data || request.body;
    
    const task = await Task.query().insert({
      name: taskData.name,
      description: taskData.description,
      statusId: parseInt(taskData.statusId, 10),
      executorId: taskData.executorId ? parseInt(taskData.executorId, 10) : null,
      creatorId: request.user.id
    });
    
    // Сохраняем метки
    if (taskData.labels) {
      let labelIds = [];
      if (Array.isArray(taskData.labels)) {
        labelIds = taskData.labels.map(id => parseInt(id, 10));
      } else {
        labelIds = [parseInt(taskData.labels, 10)];
      }
      
      for (const labelId of labelIds) {
        await task.$relatedQuery('labels').relate(labelId);
      }
    }
    
    reply.flash('success', 'Задача успешно создана');
    return reply.redirect('/tasks');
  } catch (error) {
    console.error('Create task error:', error);
    
    const users = await User.query().select('id', 'firstName', 'lastName').orderBy('id');
    const statuses = await TaskStatus.query().orderBy('id');
    const labels = await Label.query().orderBy('id');
    
    reply.flash('error', 'Ошибка при создании задачи: ' + error.message);
    return reply.view('tasks/new', {
      task: request.body.data || request.body,
      users,
      statuses,
      labels,
      title: 'Создание задачи',
      user: request.user
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

// Обновление задачи
export const updateTask = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const { id } = request.params;
  
  try {
    const existingTask = await Task.query().findById(id);
    if (!existingTask) {
      reply.flash('error', 'Задача не найдена');
      return reply.redirect('/tasks');
    }
    
    if (existingTask.creatorId !== request.user.id) {
      reply.flash('error', 'Вы можете редактировать только свои задачи');
      return reply.redirect('/tasks');
    }
    
    const taskData = request.body.data || request.body;
    
    // Обновляем задачу
    await Task.query().patchAndFetchById(id, {
      name: taskData.name,
      description: taskData.description,
      statusId: parseInt(taskData.statusId, 10),
      executorId: taskData.executorId ? parseInt(taskData.executorId, 10) : null
    });
    
    // Обновляем метки
    const task = await Task.query().findById(id);
    await task.$relatedQuery('labels').unrelate();
    
    if (taskData.labels) {
      let labelIds = [];
      if (Array.isArray(taskData.labels)) {
        labelIds = taskData.labels.map(id => parseInt(id, 10));
      } else {
        labelIds = [parseInt(taskData.labels, 10)];
      }
      
      for (const labelId of labelIds) {
        await task.$relatedQuery('labels').relate(labelId);
      }
    }
    
    reply.flash('success', 'Задача успешно обновлена');
    return reply.redirect('/tasks');
  } catch (error) {
    console.error('Update task error:', error);
    
    const task = await Task.query().findById(id);
    const users = await User.query().select('id', 'firstName', 'lastName').orderBy('id');
    const statuses = await TaskStatus.query().orderBy('id');
    const labels = await Label.query().orderBy('id');
    
    reply.flash('error', 'Ошибка при обновлении задачи: ' + error.message);
    return reply.view('tasks/edit', {
      task: { ...task, ...(request.body.data || request.body) },
      users,
      statuses,
      labels,
      title: 'Редактирование задачи',
      user: request.user
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
  
  if (task.creatorId !== request.user.id) {
    reply.flash('error', 'Только создатель может удалить задачу');
    return reply.redirect('/tasks');
  }
  
  try {
    await task.$relatedQuery('labels').unrelate();
    await Task.query().deleteById(id);
    reply.flash('success', 'Задача успешно удалена');
  } catch (error) {
    console.error('Delete task error:', error);
    reply.flash('error', 'Ошибка при удалении задачи');
  }
  
  return reply.redirect('/tasks');
};
