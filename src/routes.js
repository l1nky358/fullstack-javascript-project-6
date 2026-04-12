import * as usersController from './controllers/usersController.js';
import * as statusesController from './controllers/statusesController.js';

export default async function routes(app) {
  // Главная
  app.get('/', async (request, reply) => {
    return reply.view('index', {
      title: 'Task Manager',
    });
  });

  // Редирект с /login на /session/new
  app.get('/login', async (request, reply) => {
    return reply.redirect('/session/new');
  });

  // Пользователи
  app.get('/users', usersController.listUsers);
  app.get('/users/new', usersController.newUserForm);
  app.post('/users', usersController.createUser);
  app.get('/users/:id/edit', usersController.editUserForm);
  app.patch('/users/:id', usersController.updateUser);
  app.delete('/users/:id', usersController.deleteUser);

  // Статусы
  app.get('/statuses', statusesController.listStatuses);
  app.get('/statuses/new', statusesController.newStatusForm);
  app.post('/statuses', statusesController.createStatus);
  app.get('/statuses/:id/edit', statusesController.editStatusForm);
  app.patch('/statuses/:id', statusesController.updateStatus);
  app.delete('/statuses/:id', statusesController.deleteStatus);
}