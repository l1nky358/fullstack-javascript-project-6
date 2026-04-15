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
    
    // Базовый запрос
    let query = Task.query()
      .withGraphFetched('[creator, executor, status]')
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
    
    // Фильтр по метке
    if (label && label !== '') {
      try {
        // Получаем ID задач, у которых есть указанная метка
        const tasksWithLabel = await Task.knex()
          .select('taskId')
          .from('task_labels')
          .where('labelId', parseInt(label, 10));
        
        const taskIds = tasksWithLabel.map(t => t.taskId);
        
        if (taskIds.length === 0) {
          tasks = [];
        } else {
          // Применяем остальные фильтры и фильтр по меткам
          tasks = await query.whereIn('id', taskIds);
        }
        
        console.log(`Found ${tasks.length} tasks with label ${label}`);
      } catch (error) {
        console.error('Error filtering by label:', error);
        tasks = await query;
      }
    } else {
      // Без фильтра по метке - показываем все задачи
      tasks = await query;
    }
    
    // Получаем данные для фильтров
    const statuses = await TaskStatus.query().orderBy('id');
    const users = await User.query().select('id', 'firstName', 'lastName').orderBy('id');
    const labels = await Label.query().orderBy('id');
    
    console.log(`Total tasks found: ${tasks.length}`);
    
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
    console.error('List tasks error:', error);
    reply.flash('error', 'Ошибка при загрузке задач');
    return reply.redirect('/');
  }
};

// Остальные функции (showTask, newTaskForm, createTask, editTaskForm, updateTask, deleteTask)
export const showTask = async (request, reply) => {
  const { id } = request.params;
  try {
    const task = await Task.query()
      .withGraphFetched('[creator, executor, status]')
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
    
    if (taskData.labels && taskData.labels.length > 0) {
      try {
        for (const labelId of taskData.labels) {
          await Task.knex().insert({
            taskId: task.id,
            labelId: parseInt(labelId, 10)
          }).into('task_labels');
        }
      } catch (error) {
        console.error('Error adding labels:', error);
      }
    }
    
    reply.flash('success', 'Задача успешно создана');
    return reply.redirect('/tasks');
  } catch (error) {
    console.error('Create task error:', error);
    
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
  const task = await Task.query().findById(id);
  
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
  
  // Получаем метки задачи
  const taskLabels = await Task.knex()
    .select('labelId')
    .from('task_labels')
    .where('taskId', parseInt(id, 10));
  
  const taskLabelIds = taskLabels.map(l => l.labelId);
  
  return reply.view('tasks/edit', {
    task: { ...task, labels: taskLabelIds },
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
    
    // Обновляем метки
    if (taskData.labels) {
      try {
        // Удаляем старые связи
        await Task.knex().delete().from('task_labels').where('taskId', parseInt(id, 10));
        
        // Добавляем новые
        for (const labelId of taskData.labels) {
          await Task.knex().insert({
            taskId: parseInt(id, 10),
            labelId: parseInt(labelId, 10)
          }).into('task_labels');
        }
      } catch (error) {
        console.error('Error updating labels:', error);
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
    // Удаляем связи с метками
    await Task.knex().delete().from('task_labels').where('taskId', parseInt(id, 10));
    await Task.query().deleteById(id);
    reply.flash('success', 'Задача успешно удалена');
  } catch (error) {
    console.error('Delete task error:', error);
    reply.flash('error', 'Ошибка при удалении задачи');
  }
  
  return reply.redirect('/tasks');
};
