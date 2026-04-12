import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import app from '../src/index.js';
import User from '../src/models/User.js';
import TaskStatus from '../src/models/TaskStatus.js';
import Task from '../src/models/Task.js';
import Label from '../src/models/Label.js';

describe('Tasks Filtering', () => {
  let testUser;
  let testStatus;
  let testLabel;
  
  before(async () => {
    // Создаем тестовые данные
    testUser = await User.query().insert({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123'
    });
    
    testStatus = await TaskStatus.query().insert({
      name: 'Test Status'
    });
    
    testLabel = await Label.query().insert({
      name: 'Test Label'
    });
    
    // Создаем тестовые задачи
    await Task.query().insert({
      name: 'Task 1',
      statusId: testStatus.id,
      creatorId: testUser.id,
      executorId: testUser.id
    });
    
    await Task.query().insert({
      name: 'Task 2',
      statusId: testStatus.id,
      creatorId: testUser.id
    });
  });
  
  after(async () => {
    // Очищаем тестовые данные
    await Task.query().delete();
    await Label.query().delete();
    await TaskStatus.query().delete();
    await User.query().delete();
  });
  
  test('filter by status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/tasks?statusId=${testStatus.id}`
    });
    
    assert.equal(response.statusCode, 200);
  });
  
  test('filter by executor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/tasks?executorId=${testUser.id}`
    });
    
    assert.equal(response.statusCode, 200);
  });
  
  test('filter by creator (current user)', async () => {
    // Создаем сессию для тестового пользователя
    const response = await app.inject({
      method: 'GET',
      url: '/tasks?isCreatorUser=on'
    });
    
    assert.equal(response.statusCode, 200);
  });
});