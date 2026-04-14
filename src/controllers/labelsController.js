import Label from '../models/Label.js';

export const listLabels = async (request, reply) => {
  const labels = await Label.query().orderBy('id');
  return reply.view('labels/index', {
    labels,
    title: 'Метки',
  });
};

export const newLabelForm = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }
  
  // Очищаем старые flash сообщения при загрузке формы
  if (request.session) {
    request.session.flash = {};
  }
  
  return reply.view('labels/new', {
    label: {},
    errors: null,
    title: 'Создание метки',
  });
};

export const createLabel = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const labelData = request.body.data;
  const errors = {};
  
  if (!labelData.name || labelData.name.trim() === '') {
    errors.name = 'Наименование не должно быть пустым';
  }
  
  if (Object.keys(errors).length > 0) {
    reply.flash('error', 'Не удалось создать метку');
    return reply.view('labels/new', {
      label: labelData,
      errors: errors,
      title: 'Создание метки',
    });
  }
  
  try {
    await Label.query().insert(labelData);
    reply.flash('success', 'Метка успешно создана');
    return reply.redirect('/labels');
  } catch (error) {
    reply.flash('error', 'Не удалось создать метку');
    return reply.view('labels/new', {
      label: labelData,
      errors: { name: 'Ошибка при создании метки' },
      title: 'Создание метки',
    });
  }
};

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

export const updateLabel = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const { id } = request.params;
  
  try {
    const labelData = request.body.data;
    await Label.query().patchAndFetchById(id, labelData);
    reply.flash('success', 'Метка успешно изменена');
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

export const deleteLabel = async (request, reply) => {
  if (!request.user) {
    reply.flash('error', 'Требуется авторизация');
    return reply.redirect('/session/new');
  }

  const { id } = request.params;
  
  try {
    await Label.query().deleteById(id);
    reply.flash('success', 'Метка успешно удалена');
  } catch (error) {
    reply.flash('error', 'Ошибка при удалении метки');
  }
  
  return reply.redirect('/labels');
};
