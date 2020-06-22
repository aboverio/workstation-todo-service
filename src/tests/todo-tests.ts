import supertest from 'supertest';

import app from '@/app';
import { defaultTestPort, apiVersion } from '@/config';
import { startAPI, stopAPI } from '@/utils';

const request = supertest.agent(app);

const wrongTodoID = 'thisiswrongtodoobjectid';

let username: string;
let todoId: string;
let csrfToken: string;

describe('Todo Model Tests', () => {
  beforeAll(async () => {
    await startAPI(app, {
      port: defaultTestPort,
      env: 'test',
    });
  });

  test('Sign In - Success', async () => {
    const signInData = {
      userIdentifier: 'johndoe',
      password: '`Jackiechen2',
    };
    const response = await request
      .post(`/${apiVersion}/users/signin`)
      .send(signInData);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('tokens');
    expect(response.status).toBe(200);
    username = response.body.user.username;
    csrfToken = response.body.tokens.csrfToken;
  });

  test('Add Todo - Success', async () => {
    const addTodoData = {
      name: 'Create Client using Next.js',
      due: new Date(),
      priority: 0,
      _csrf: csrfToken,
    };
    const response = await request
      .post(`/${apiVersion}/todos`)
      .send(addTodoData);
    expect(response.body).toHaveProperty('todo');
    expect(response.body).toHaveProperty('message');
    expect(response.body.todo.name).toBe(addTodoData.name);
    expect(response.body.message).toBe('Successfully created todo!');
    todoId = response.body.todo._id;
  });

  test('Get All Todos - Success', async () => {
    const response = await request.get(`/${apiVersion}/todos`).send({
      _csrf: csrfToken,
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('todos');
    expect(Array.isArray(response.body.todos)).toBe(true);
  });

  test('Get a Specified Todo - Success', async () => {
    const response = await request.get(`/${apiVersion}/todos/${todoId}`).send({
      _csrf: csrfToken,
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('todo');
    expect(response.body.todo instanceof Object).toBe(true);
  });

  test('Update Todo - Success', async () => {
    const updateTodoData = {
      name: 'Install MySQL',
      due: new Date(),
      priority: 0,
      _csrf: csrfToken,
    };
    const response = await request
      .put(`/${apiVersion}/todos/${todoId}`)
      .send(updateTodoData);
    expect(response.body).toHaveProperty('todo');
    expect(response.body).toHaveProperty('message');
    expect(response.body.todo.name).toBe(updateTodoData.name);
    expect(response.body.message).toBe('Successfully updated todo!');
    expect(response.status).toBe(200);
  });

  test('Update Todo - Not Found Error', async () => {
    const updateTodoData = {
      name: 'Install MySQL',
      due: new Date(),
      priority: 0,
      _csrf: csrfToken,
    };
    const response = await request
      .put(`/${apiVersion}/todos/${wrongTodoID}`)
      .send(updateTodoData);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(
      `Cannot update, no todo whose ID is ${wrongTodoID} found!`
    );
    expect(response.status).toBe(404);
  });

  test('Complete Todo - Success', async () => {
    const response = await request
      .patch(`/${apiVersion}/todos/complete/${todoId}`)
      .send({
        _csrf: csrfToken,
      });
    expect(response.body).toHaveProperty('todo');
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Successfully completed todo!');
    expect(response.status).toBe(200);
  });

  test('Complete Todo - Not Found Error', async () => {
    const response = await request
      .patch(`/${apiVersion}/todos/complete/${wrongTodoID}`)
      .send({
        _csrf: csrfToken,
      });
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(
      `Cannot complete, no todo whose ID is ${wrongTodoID} found!`
    );
    expect(response.status).toBe(404);
  });

  test('Uncomplete Todo - Success', async () => {
    const response = await request
      .patch(`/${apiVersion}/todos/uncomplete/${todoId}`)
      .send({
        _csrf: csrfToken,
      });
    expect(response.body).toHaveProperty('todo');
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Successfully uncompleted todo!');
    expect(response.status).toBe(200);
  });

  test('Uncomplete Todo - Not Found Error', async () => {
    const response = await request
      .patch(`/${apiVersion}/todos/uncomplete/${wrongTodoID}`)
      .send({
        _csrf: csrfToken,
      });
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(
      `Cannot uncomplete, no todo whose ID is ${wrongTodoID} found!`
    );
    expect(response.status).toBe(404);
  });

  test('Delete Todo - Success', async () => {
    const response = await request
      .delete(`/${apiVersion}/todos/${todoId}`)
      .send({
        _csrf: csrfToken,
      });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('todo');
    expect(response.body).toHaveProperty('message');
    expect(response.body.todo instanceof Object).toBe(true);
    expect(typeof response.body.message).toBe('string');
    expect(response.body.message).toBe('Successfully deleted todo!');
  });

  test('Delete User - Success', async () => {
    const response = await request
      .delete(`/${apiVersion}/users/${username}`)
      .send({
        _csrf: csrfToken,
      });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Successfully deleted account!');
  });

  afterAll(async () => {
    await stopAPI(app, {
      env: 'test',
      db: 'drop',
    });
  });
});