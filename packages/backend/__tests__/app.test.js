const request = require('supertest');
const { app, db } = require('../src/app');

// Close the database connection after all tests
afterAll(() => {
  if (db) {
    db.close();
  }
});

// Test helpers
const createItem = async (name = 'Temp Item to Delete', dueDate = null) => {
  const response = await request(app)
    .post('/api/items')
    .send({ name, due_date: dueDate })
    .set('Accept', 'application/json');

  expect(response.status).toBe(201);
  expect(response.body).toHaveProperty('id');
  return response.body;
};

describe('API Endpoints', () => {
  describe('GET /api/items', () => {
    it('should return all items', async () => {
      const response = await request(app).get('/api/items');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check if items have the expected structure
      const item = response.body[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('due_date');
      expect(item).toHaveProperty('created_at');
    });

    it('should return items sorted by name in reverse alphabetical order', async () => {
      await createItem('Alpha Task');
      await createItem('Zulu Task');

      const response = await request(app).get('/api/items');
      expect(response.status).toBe(200);

      const names = response.body.map((item) => item.name);
      const alphaIndex = names.indexOf('Alpha Task');
      const zuluIndex = names.indexOf('Zulu Task');

      expect(alphaIndex).toBeGreaterThan(-1);
      expect(zuluIndex).toBeGreaterThan(-1);
      expect(zuluIndex).toBeLessThan(alphaIndex);
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const newItem = { name: 'Test Item', due_date: '2026-03-15' };
      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newItem.name);
      expect(response.body.due_date).toBe(newItem.due_date);
      expect(response.body).toHaveProperty('created_at');
    });

    it('should create a new item without due date', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: 'No Due Date Item' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('No Due Date Item');
      expect(response.body.due_date).toBeNull();
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({})
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Item name is required');
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: '' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Item name is required');
    });

    it('should return 400 for invalid due date', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: 'Invalid Due Date Item', due_date: 'not-a-date' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Due date must be a valid date string');
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should delete an existing item', async () => {
      const item = await createItem('Item To Be Deleted');

      const deleteResponse = await request(app).delete(`/api/items/${item.id}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toEqual({ message: 'Item deleted successfully', id: item.id });

      const deleteAgain = await request(app).delete(`/api/items/${item.id}`);
      expect(deleteAgain.status).toBe(404);
      expect(deleteAgain.body).toHaveProperty('error', 'Item not found');
    });

    it('should return 404 when item does not exist', async () => {
      const response = await request(app).delete('/api/items/999999');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Item not found');
    });

    it('should return 400 for invalid id', async () => {
      const response = await request(app).delete('/api/items/abc');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Valid item ID is required');
    });
  });
});