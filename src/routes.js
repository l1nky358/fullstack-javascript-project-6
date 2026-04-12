import * as usersController from './controllers/usersController.js';
import * as statusesController from './controllers/statusesController.js';
import * as tasksController from './controllers/tasksController.js';
import * as labelsController from './controllers/labelsController.js';

export default async function routes(app) {
  // Главная
  app.get('/', async (request, reply) => {
    return reply.view('index', {
      title: 'Task Manager',
    });
  });

  // Редиректы
  app.get('/login', async (request, reply) => {
    return reply.redirect('/session/new');
  });

  app.get('/register', async (request, reply) => {
    return reply.redirect('/users/new');
  });

  // Пользователи
  app.get('/users', usersController.listUsers);
  app.get('/users/new', usersController.newUserForm);
  app.post('/users', usersController.createUser);
  app.get('/users/:id/edit', usersController.editUserForm);
  app.post('/users/:id/update', usersController.updateUser);
  app.post('/users/:id/delete', usersController.deleteUser);

  // Статусы
  app.get('/statuses', statusesController.listStatuses);
  app.get('/statuses/new', statusesController.newStatusForm);
  app.post('/statuses', statusesController.createStatus);
  app.get('/statuses/:id/edit', statusesController.editStatusForm);
  app.post('/statuses/:id/update', statusesController.updateStatus);
  app.post('/statuses/:id/delete', statusesController.deleteStatus);

  // Метки
  app.get('/labels', labelsController.listLabels);
  app.get('/labels/new', labelsController.newLabelForm);
  app.post('/labels', labelsController.createLabel);
  app.get('/labels/:id/edit', labelsController.editLabelForm);
  app.post('/labels/:id/update', labelsController.updateLabel);
  app.post('/labels/:id/delete', labelsController.deleteLabel);

  // Задачи
  app.get('/tasks', tasksController.listTasks);
  app.get('/tasks/new', tasksController.newTaskForm);
  app.post('/tasks', tasksController.createTask);
  app.get('/tasks/:id', tasksController.showTask);
  app.get('/tasks/:id/edit', tasksController.editTaskForm);
  app.post('/tasks/:id/update', tasksController.updateTask);
  app.post('/tasks/:id/delete', tasksController.deleteTask);
}
