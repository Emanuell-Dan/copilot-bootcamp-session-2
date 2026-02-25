const request = require('supertest');
const { app } = require('../src/app');

describe('Items API E2E Flow', () => {
  it('creates tasks with due dates and returns them in reverse alphabetical order', async () => {
    const payloads = [
      { name: 'Bravo Task', due_date: '2026-06-01' },
      { name: 'Alpha Task', due_date: '2026-06-02' },
      { name: 'Zulu Task', due_date: '2026-05-30' },
    ];

    for (const payload of payloads) {
      const response = await request(app).post('/api/items').send(payload);
      expect(response.status).toBe(201);
      expect(response.body.name).toBe(payload.name);
      expect(response.body.due_date).toBe(payload.due_date);
    }

    const listResponse = await request(app).get('/api/items');
    expect(listResponse.status).toBe(200);

    const createdTasks = listResponse.body.filter((item) =>
      payloads.some((payload) => payload.name === item.name)
    );

    expect(createdTasks.slice(0, 3).map((item) => item.name)).toEqual([
      'Zulu Task',
      'Bravo Task',
      'Alpha Task',
    ]);
  });
});
