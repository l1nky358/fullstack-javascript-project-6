import Label from '../models/Label.js';

// Список всех меток
export const listLabels = async (request, reply) => {
  const labels = await Label.query().orderBy('id');
  return reply.view('labels/index', {
    labels,
    title: 'Метки',
  });
};

// Форма создания метки
export const newLabelForm = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }
  
  return reply.view('labels/new', {
    label: {},
    title: 'Создание метки',
  });
};

// Создание метки
export const createLabel = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  try {
    const labelData = request.body.data;
    await Label.query().insert(labelData);
    reply.flash('success', 'Метка успешно создана');
    return reply.redirect('/labels');
  } catch (error) {
    reply.flash('error', 'Ошибка при создании метки');
    return reply.view('labels/new', {
      label: request.body.data,
      errors: error.data,
      title: 'Создание метки',
    });
  }
};

// Форма редактирования метки
export const editLabelForm = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }
  
  const { id } = request.params;
  const label = await Label.query().findById(id);
  
  if (!label) {
    reply.flash('error', 'Метка не найдена');
    return reply.redirect('/labels');
  }
  
  return reply.view('labels/edit', {
    label,
    title: 'Редактирование метки',
  });
};

// Обновление метки
export const updateLabel = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const { id } = request.params;
  
  try {
    const labelData = request.body.data;
    await Label.query().patchAndFetchById(id, labelData);
    reply.flash('success', 'Метка успешно обновлена');
    return reply.redirect('/labels');
  } catch (error) {
    const label = await Label.query().findById(id);
    reply.flash('error', 'Ошибка при обновлении метки');
    return reply.view('labels/edit', {
      label: { ...label, ...request.body.data },
      errors: error.data,
      title: 'Редактирование метки',
    });
  }
};

// Удаление метки
export const deleteLabel = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const { id } = request.params;
  
  // Проверка, есть ли задачи с этой меткой
  const labelWithTasks = await Label.query()
    .findById(id)
    .withGraphFetched('tasks');
  
  if (labelWithTasks.tasks && labelWithTasks.tasks.length > 0) {
    reply.flash('error', 'Невозможно удалить метку, так как она используется в задачах');
    return reply.redirect('/labels');
  }
  
  try {
    await Label.query().deleteById(id);
    reply.flash('success', 'Метка успешно удалена');
  } catch (error) {
    reply.flash('error', 'Ошибка при удалении метки');
  }
  
  return reply.redirect('/labels');
};